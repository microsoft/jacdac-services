namespace jacdac.twins {
    const MAX_READINGS_PER_PACKET = 100 // TODO
    const READINGS_SEND_INTERVAL = 5000
    const MAX_HEADER_SIZE = 200
    const MAX_PACKET_SIZE = 1000 // this is transmitted as HEX, so grows 2x

    let twins: DeviceTwin[]
    let exclusions: string[]
    let currTwin: Json
    let pendingReadings = 0
    let pendingMessageSize = 0
    let lastReadingsSent: number
    let messageBuffer: Buffer
    let messagePtr = 0
    let numMsg = 0

    function feedWatchdog() {
        control.feedWatchdog()
    }

    function writeBuffer(buf: Buffer) {
        messageBuffer.write(messagePtr, buf)
        messagePtr += buf.length
    }

    const streamingIntervalSpec: ServiceTwinRegisterSpec = {
        name: "streaming_interval",
        code: SystemReg.StreamingInterval,
        flags: 0,
        packf: "u32",
    }

    const enum ServiceTwinRegisterFlag {
        Const = 0x0001,
        Volatile = 0x0002,
    }

    interface ServiceTwinRegisterSpec {
        code: number // code <= 255 => ro, otherwise rw
        name: string
        flags: ServiceTwinRegisterFlag
        packf: string
        fields?: string[]
    }

    interface ServiceTwinSpec {
        serviceClass: number
        name: string
        registers: ServiceTwinRegisterSpec[]
    }

    class ServiceTwin {
        id: string
        enabled: boolean
        readingBuffer: Buffer
        readingPtr = 0
        header: Buffer
        pendingSamples = 0

        constructor(
            public parent: DeviceTwin,
            public serviceIdx: number,
            public spec: ServiceTwinSpec
        ) {
            this.id = spec.name
            if (this.spec.registers.some(r => r.code == SystemReg.Reading)) {
                this.spec.registers.push(streamingIntervalSpec)
                this.enabled = true
            }
            this.header = Buffer.fromUTF8(
                this.parent.id + ":" + this.id + "\u0000"
            )
            if (this.header.length > MAX_HEADER_SIZE - 8)
                throw "header too large"
        }

        serialize(now: number) {
            if (!this.readingPtr) return // skip

            const len = this.readingPtr
            const buf = this.readingBuffer
            for (let i = 0; i < len; i += 8) {
                const ts = buf.getNumber(NumberFormat.UInt32LE, i)
                buf.setNumber(NumberFormat.UInt32LE, i, now - ts)
            }
            writeBuffer(this.header)
            writeBuffer(jdpack("u32", [this.readingPtr]))
            writeBuffer(buf.slice(0, this.readingPtr))
            this.readingPtr = 0
            if (len < this.readingBuffer.length >> 1) this.readingBuffer = null
        }

        tick() {
            if (this.enabled && this.pendingSamples < 100) {
                this.pendingSamples = 254
                const payload = JDPacket.jdpacked(
                    CMD_SET_REG | SystemReg.StreamingSamples,
                    "u8",
                    [254]
                )
                payload.serviceIndex = this.serviceIdx
                payload._sendCmd(this.parent.device)
            }
        }

        applyTwinUpdate(upd: Json) {
            console.log("applying update: " + JSON.stringify(upd))
            const regs = upd["registers"]
            // always enable
            //if (regs["streaming"] !== undefined)
            //    this.enabled = !!regs["streaming"]
            this.enabled = true
            for (const k of Object.keys(regs)) {
                const rspec = this.spec.registers.find(r => r.name == k)
                const v = regs[k]
                if (rspec && typeof v == "number" && rspec.code < 0x100) {
                    console.log(`set ${this.id}.${rspec.name} to ${v}`)
                    const payload = JDPacket.jdpacked(
                        CMD_SET_REG | rspec.code,
                        rspec.packf,
                        [v]
                    )
                    payload.serviceIndex = this.serviceIdx
                    payload._sendCmd(this.parent.device)
                }
            }
        }

        computeTwin(forReal: boolean) {
            const registers: any = {}
            const res = {
                registers,
            }
            if (forReal && this.enabled !== undefined) {
                registers["streaming"] = this.enabled
            }
            const d = this.parent.device
            for (const r of this.spec.registers) {
                if (exclusions.indexOf(this.spec.name + "." + r.name) >= 0)
                    continue
                if (r.code == SystemReg.Reading) continue

                let buf = d.query(
                    r.code,
                    r.flags & ServiceTwinRegisterFlag.Const ? null : 500,
                    this.serviceIdx
                )

                if (buf && r.code == SystemReg.StreamingInterval) {
                    const v = jdunpack(buf, "u32")[0]
                    if (v < 1000) {
                        const payload = JDPacket.jdpacked(
                            CMD_SET_REG | SystemReg.StreamingInterval,
                            "u32",
                            [1000]
                        )
                        payload.serviceIndex = this.serviceIdx
                        payload._sendCmd(this.parent.device)
                        buf = payload.data.slice()
                    }
                }

                if (forReal && buf) {
                    const vals = jdunpack(buf, r.packf)
                    let rv: any
                    if (r.fields) {
                        rv = {}
                        let i = 0
                        for (const f of r.fields) {
                            rv[f] = vals[i++]
                        }
                    } else {
                        rv = vals[0]
                    }
                    registers[r.name] = rv
                }
            }

            return res
        }

        process(pkt: JDPacket) {
            if (
                this.enabled &&
                pkt.isRegGet &&
                pkt.regCode == SystemReg.Reading
            ) {
                const rspec = this.spec.registers.find(
                    r => r.code == SystemReg.Reading
                )
                let v = jdunpack(pkt.data, rspec.packf)[0]
                const scaleToPercent =
                    rspec.packf.slice(0, "u0.".length) == "u0."
                if (scaleToPercent) v *= 100

                if (
                    !this.readingBuffer ||
                    this.readingPtr + 8 > this.readingBuffer.length
                ) {
                    const prev = this.readingBuffer
                    this.readingBuffer = Buffer.create(
                        this.readingBuffer ? this.readingPtr + 32 : 16
                    )
                    if (prev) this.readingBuffer.write(0, prev)
                }
                this.readingBuffer.setNumber(
                    NumberFormat.UInt32LE,
                    this.readingPtr,
                    control.millis()
                )
                this.readingBuffer.setNumber(
                    NumberFormat.Float32LE,
                    this.readingPtr + 4,
                    v
                )
                if (this.readingPtr == 0)
                    pendingMessageSize += this.header.length
                this.readingPtr += 8
                pendingReadings++
                pendingMessageSize += 8
                this.pendingSamples--
                checkPendingReadings()
            }
        }
    }

    function toHexNum(n: number) {
        if (n == 0) return "0"
        const buf = control.createBuffer(4)
        buf.setNumber(NumberFormat.UInt32BE, 0, n)
        return buf.toHex()
    }

    const ignoredServices = [
        SRV_CONTROL,
        SRV_ROLE_MANAGER,
        SRV_LOGGER,
        SRV_SETTINGS,
        SRV_BOOTLOADER,
        SRV_PROTO_TEST,
        SRV_INFRASTRUCTURE,
        SRV_PROXY,
        0x103c4ee5, // srv unique brain
        SRV_WIFI,
        SRV_AZURE_IOT_HUB_HEALTH,
    ]

    function getServiceTwinSpec(serviceClass: number): ServiceTwinSpec {
        if (ignoredServices.indexOf(serviceClass) > -1) return null
        const key = "x7-" + serviceClass
        const cached = settings.readString(key)
        if (cached) return JSON.parse(cached)

        const url = `https://microsoft.github.io/jacdac-docs/services/twin/x${toHexNum(
            serviceClass
        )}.json`

        if (azureiot.isConnected()) {
            console.log(`disconnecting MQTT to fetch ${url}`)
            azureiot.disconnect()
        }

        // query HEAD initially to probe if the file exists
        let json: any
        const head = net.request("HEAD", url)
        const statusCode = head.status_code
        head.close()
        if (statusCode !== 200) {
            console.log(`service spec not found at ${url} (${statusCode})`)
            json = null
        } else {
            json = net.getJSON(url)
            if (!json) {
                console.warn("failed to get serv: " + url)
                json = null
            }
            console.log(`got serv: ${url} ${JSON.stringify(json).length} bytes`)
        }
        settings.writeString(key, JSON.stringify(json))
        return json
    }

    class DeviceTwin {
        id: string
        services: ServiceTwin[] = []
        constructor(public device: jacdac.Device) {
            this.device.on(jacdac.DEVICE_DISCONNECT, () => {
                twins.removeElement(this)
            })
            this.id = this.device.shortId + "_" + this.device.deviceId
            twins.push(this)
            this.device.on(jacdac.PACKET_RECEIVE, (pkt: JDPacket) => {
                const srv = this.services[pkt.serviceIndex]
                if (srv) srv.process(pkt)
            })

            const d = this.device
            for (let servIdx = 0; servIdx < d.serviceClassLength; ++servIdx) {
                const cl = d.serviceClassAt(servIdx)
                const spec = getServiceTwinSpec(cl)
                if (!spec) continue

                const newServ = new ServiceTwin(this, servIdx, spec)
                if (this.services.find(s => s && s.id == newServ.id)) {
                    let i = 2
                    while (
                        this.services.find(s => s.id == newServ.id + "_" + i)
                    )
                        i++
                    newServ.id += "_" + i
                }

                this.services[servIdx] = newServ
            }
        }

        applyTwinUpdate(upd: Json) {
            for (const s of this.services)
                if (s && upd[s.id]) s.applyTwinUpdate(upd[s.id])
        }

        tick() {
            for (const serv of this.services) {
                if (serv) serv.tick()
            }
        }

        serialize(now: number) {
            for (const serv of this.services) {
                if (serv) serv.serialize(now)
            }
        }

        computeTwin(forReal = true) {
            const twin: Json = {}
            for (const serv of this.services) {
                if (serv) {
                    const res = serv.computeTwin(forReal)
                    if (forReal) twin[serv.id] = res
                }
            }
            return forReal ? twin : undefined
        }
    }

    function rescanDevices() {
        if (!connect()) return
        try {
            scan()
        } catch (e) {
            console.error("unhandled scan exception:")
            console.error(e)
        }
    }

    function scan() {
        // console.log(`scan: ${jacdac.bus.devices.length} / ${twins.length}`)
        for (const d of jacdac.bus.devices) {
            if (!twins.some(t => t.device == d)) new DeviceTwin(d)
        }
        for (const t of twins) t.tick()
        if (!azureiot.isConnected()) return
        for (let i = 0; i < 2; ++i) {
            for (const t of twins) {
                t.computeTwin(false)
            }
            pause(100)
        }
        const fullTwin: Json = {}
        for (const t of twins) {
            fullTwin[t.id] = t.computeTwin()
        }
        if (!currTwin) {
            console.debug(JSON.stringify(fullTwin, null, 1))
            currTwin = fullTwin
            const cloudTwin = azureiot.getTwin()
            const patch = azureiot.computePatch(cloudTwin["reported"], currTwin)
            azureiot.patchTwin(patch)
            connectTwinUpdate()
        } else {
            const patch = azureiot.computePatch(currTwin, fullTwin)
            if (Object.keys(patch).length > 0) {
                console.debug(JSON.stringify(patch, null, 1))
                azureiot.patchTwin(patch)
            }
            currTwin = fullTwin
        }
        checkPendingReadings(true)
    }

    function checkPendingReadings(checkTime = false) {
        if (
            pendingMessageSize > messageBuffer.length - MAX_HEADER_SIZE ||
            pendingReadings > MAX_READINGS_PER_PACKET ||
            (checkTime &&
                pendingReadings > 0 &&
                control.millis() - lastReadingsSent > READINGS_SEND_INTERVAL)
        ) {
            console.log(
                `sending readings: #${numMsg++} ${pendingReadings} readings, ${pendingMessageSize} bytes, delta ${
                    control.millis() - lastReadingsSent
                }ms`
            )

            lastReadingsSent = control.millis()
            pendingReadings = 0
            pendingMessageSize = 0
            messagePtr = 0
            writeBuffer(jdpack("s[4] u32", ["JDBR", lastReadingsSent]))
            writeBuffer(Buffer.create(32))
            const prev = messagePtr
            for (const t of twins) t.serialize(lastReadingsSent)
            if (messagePtr != prev) {
                if (azureiot.isConnected()) {
                    azureiot.publishMessageHex(messageBuffer, messagePtr, {
                        jdbr: "1",
                    })
                    sendTick = 2
                    feedWatchdog()
                }
            }
        }
    }

    function applyTwinUpdate(upd: Json) {
        for (const t of twins) {
            if (upd[t.id]) t.applyTwinUpdate(upd[t.id])
        }
    }

    type Json = any

    function connectTwinUpdate() {
        // TODO apply twin updates when new device is connected
        control.runInBackground(() => {
            pause(100)
            azureiot.onTwinUpdate((twin, patch) => {
                console.log(`apply: ${JSON.stringify(patch, null, 1)}`)
                applyTwinUpdate(patch)
            })
        })
    }

    function connect() {
        if (!net.Net.instance.controller.isConnected) return false

        try {
            // connection key may not be set
            azureiot.connect()
            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    let statusPhase = 0
    let sendTick = 0
    const sim = control.deviceDalVersion() == "sim"

    function statusLight() {
        const controller = net.instance().controller

        statusPhase += 4

        let phase = statusPhase
        let r = 0
        let g = 0
        let b = 0

        if (controller.isConnected) {
            g = sim ? 0xf000 : 0x0800
            if (azureiot.isConnected()) {
                phase >>= 2 // slower blink
            } else {
                // quick
            }
        } else {
            r = sim ? 0xf000 : 0x2000
        }

        phase = Math.abs((phase & 31) - 16)
        if (phase > 15) phase = 15
        r = (r * phase) >> 4
        g = (g * phase) >> 4
        b = (b * phase) >> 4

        if (sendTick) {
            sendTick--
            r = 0
            g = 0
            b = sim ? 0xf000 : 0x2000
        }

        jacdac.setLed(r, g, b)
    }

    export function init() {
        if (twins) return
        twins = []

        jacdac.bus.on(PACKET_PROCESS, (pkt: JDPacket) => {
            // feed watchdog when connected to the dashboard
            if (pkt.isReport && pkt.serviceCommand == 0) {
                for (let i = 0; i < pkt.data.length; i += 4) {
                    const service = pkt.data.getNumber(NumberFormat.UInt32LE, i)
                    if (service == 0x1e1589eb) feedWatchdog()
                }
            }
        })

        exclusions = []
        exclusions.push("control.uptime")
        exclusions.push("control.mcu_temperature")

        messageBuffer = Buffer.create(MAX_PACKET_SIZE)

        lastReadingsSent = control.millis()

        setInterval(statusLight, 100)

        console.log("waiting for enumeration...")
        pause(1000)
        feedWatchdog()
        console.log("waiting until connected...")
        pauseUntil(() => net.Net.instance.controller.isConnected)
        console.log("getting specs...")
        for (const d of jacdac.bus.devices) {
            feedWatchdog()
            for (let servIdx = 0; servIdx < d.serviceClassLength; ++servIdx) {
                const cl = d.serviceClassAt(servIdx)
                getServiceTwinSpec(cl)
            }
        }

        feedWatchdog()
        console.log("starting scan...")
        setInterval(rescanDevices, 1000)
    }
}
