/*
services from jacdac-v0

debugging services?
name service - need to re-implement
identification service - led blinking

*/

namespace jacdac {
    export const devNameSettingPrefix = "#jddev:"

    let hostServices: Host[]
    export let _unattachedClients: Client[]
    export let _allClients: Client[]
    let myDevice: Device
    //% whenUsed
    let devices_: Device[] = []
    //% whenUsed
    let announceCallbacks: (() => void)[] = [];
    let newDeviceCallbacks: (() => void)[];
    let pktCallbacks: ((p: JDPacket) => void)[];
    let restartCounter = 0

    function log(msg: string) {
        console.add(jacdac.consolePriority, msg);
    }

    //% fixedInstances
    export class Host {
        protected supressLog: boolean;
        running: boolean
        serviceNumber: number
        stateUpdated: boolean;
        private _statusCode: number = 0; // u16, u16

        constructor(
            public name: string,
            public readonly serviceClass: number
        ) { }

        get statusCode() {
            return this._statusCode;
        }

        setStatusCode(code: number, vendorCode: number) {
            const c = ((code & 0xffff) << 16) | (vendorCode & 0xffff)
            if (c !== this._statusCode) {
                this._statusCode = c;
                this.sendChangeEvent();
            }
        }

        handlePacketOuter(pkt: JDPacket) {
            // status code support
            if (this.handleStatusCode(pkt))
                return;

            if (pkt.service_command == SystemCmd.Announce) {
                this.sendReport(
                    JDPacket.from(SystemCmd.Announce, this.advertisementData()))
            } else {
                this.stateUpdated = false
                this.handlePacket(pkt)
            }
        }

        handlePacket(pkt: JDPacket) { }

        isConnected() {
            return this.running
        }

        advertisementData() {
            return Buffer.create(0)
        }

        protected sendReport(pkt: JDPacket) {
            pkt.service_number = this.serviceNumber
            pkt._sendReport(myDevice)
        }

        protected sendEvent(event: number, data?: Buffer) {
            const payload = Buffer.create(4 + (data ? data.length : 0))
            payload.setNumber(NumberFormat.UInt32LE, 0, event);
            if (data)
                payload.write(4, data);
            this.sendReport(JDPacket.from(SystemCmd.Event, payload))
        }

        protected sendChangeEvent(): void {
            this.sendEvent(SystemEvent.Change);
        }

        private handleStatusCode(pkt: JDPacket): boolean {
            const getset = pkt.service_command >> 12
            const reg = pkt.service_command & 0xfff
            if (reg == SystemReg.StatusCode && getset == 1) {
                this.sendReport(JDPacket.jdpacked(pkt.service_command, "u32",
                    [this._statusCode >> 0]))
                return true;
            } else {
                return false;
            }
        }

        protected handleRegFormat<T extends any[]>(pkt: JDPacket, register: number, fmt: string, current: T): T {
            const getset = pkt.service_command >> 12
            if (getset == 0 || getset > 2)
                return current
            const reg = pkt.service_command & 0xfff
            if (reg != register)
                return current
            if (getset == 1) {
                this.sendReport(JDPacket.jdpacked(pkt.service_command, fmt, current))
            } else {
                if (register >> 8 == 0x1)
                    return current // read-only
                const v = pkt.jdunpack<T>(fmt)
                if (!jdpackEqual<T>(fmt, v, current)) {
                    this.stateUpdated = true
                    current = v
                }
            }
            return current
        }

        // only use for numbers
        protected handleRegValue<T>(pkt: JDPacket, register: number, fmt: string, current: T): T {
            const getset = pkt.service_command >> 12
            if (getset == 0 || getset > 2)
                return current
            const reg = pkt.service_command & 0xfff
            if (reg != register)
                return current
            // make sure there's no null/undefined
            if (getset == 1) {
                this.sendReport(JDPacket.jdpacked(pkt.service_command, fmt, [current]))
            } else {
                if (register >> 8 == 0x1)
                    return current // read-only
                const v = pkt.jdunpack(fmt);
                if (v[0] !== current) {
                    this.stateUpdated = true
                    current = v[0]
                }
            }
            return current
        }

        protected handleRegBool(pkt: JDPacket, register: number, current: boolean): boolean {
            const res = this.handleRegValue(pkt, register, "u8", current ? 1 : 0);
            return !!res;
        }

        protected handleRegInt32(pkt: JDPacket, register: number, current: number): number {
            const res = this.handleRegValue(pkt, register, "i32", current >> 0);
            return res;
        }

        protected handleRegUInt32(pkt: JDPacket, register: number, current: number): number {
            const res = this.handleRegValue(pkt, register, "u32", current >> 0);
            return res;
        }

        protected handleRegBuffer(pkt: JDPacket, register: number, current: Buffer): Buffer {
            const getset = pkt.service_command >> 12
            if (getset == 0 || getset > 2)
                return current
            const reg = pkt.service_command & 0xfff
            if (reg != register)
                return current

            if (getset == 1) {
                this.sendReport(JDPacket.from(pkt.service_command, current))
            } else {
                if (register >> 8 == 0x1)
                    return current // read-only
                let data = pkt.data
                const diff = current.length - data.length
                if (diff == 0) { }
                else if (diff < 0)
                    data = data.slice(0, current.length)
                else
                    data = data.concat(Buffer.create(diff))

                if (!data.equals(current)) {
                    current.write(0, data)
                    this.stateUpdated = true
                }
            }
            return current
        }

        /**
         * Registers and starts the driver
         */
        //% blockId=jacdachoststart block="start %service"
        //% group="Services" blockGap=8
        start() {
            if (this.running)
                return
            this.running = true
            jacdac.start();
            this.serviceNumber = hostServices.length
            hostServices.push(this)
            this.log("start");
        }

        /**
         * Unregister and stops the driver
         */
        //% blockId=jacdachoststop block="stop %service"
        //% group="Services" blockGap=8
        stop() {
            if (!this.running)
                return
            this.running = false
            this.log("stop")
        }

        protected log(text: string) {
            if (this.supressLog || jacdac.consolePriority < console.minPriority)
                return
            let dev = selfDevice().toString()
            console.add(jacdac.consolePriority, `${dev}:${this.serviceClass}>${this.name}>${text}`);
        }
    }

    export class ClientPacketQueue {
        private pkts: Buffer[] = []

        constructor(public parent: Client) { }

        private updateQueue(pkt: JDPacket) {
            const cmd = pkt.service_command
            for (let i = 0; i < this.pkts.length; ++i) {
                if (this.pkts[i].getNumber(NumberFormat.UInt16LE, 2) == cmd) {
                    this.pkts[i] = pkt.withFrameStripped()
                    return
                }
            }
            this.pkts.push(pkt.withFrameStripped())
        }

        clear() {
            this.pkts = []
        }

        send(pkt: JDPacket) {
            if (pkt.is_reg_set || this.parent.serviceNumber == null)
                this.updateQueue(pkt)
            this.parent.sendCommand(pkt)
        }

        resend() {
            const sn = this.parent.serviceNumber
            if (sn == null || this.pkts.length == 0)
                return
            let hasNonSet = false
            for (let p of this.pkts) {
                p[1] = sn
                if ((p[3] >> 4) != (CMD_SET_REG >> 12))
                    hasNonSet = true
            }
            const pkt = JDPacket.onlyHeader(0)
            pkt.compress(this.pkts)
            this.parent.sendCommand(pkt)
            // after re-sending only leave set_reg packets
            if (hasNonSet)
                this.pkts = this.pkts.filter(p => (p[3] >> 4) == (CMD_SET_REG >> 12))
        }
    }

    interface SMap<T> {
        [index: string]: T;
    }

    //% fixedInstances
    export class Client {
        device: Device
        currentDevice: Device
        eventId: number
        broadcast: boolean // when true, this.device is never set
        serviceNumber: number;
        protected supressLog: boolean;
        started: boolean;
        advertisementData: Buffer;
        private handlers: SMap<(idx?: number) => void>;

        config: ClientPacketQueue

        constructor(
            public name: string,
            public serviceClass: number,
            public requiredDeviceName: string
        ) {
            this.eventId = control.allocateNotifyEvent();
            this.config = new ClientPacketQueue(this)
        }

        broadcastDevices() {
            return devices().filter(d => d.clients.indexOf(this) >= 0)
        }

        isConnected() {
            return !!this.device
        }

        requestAdvertisementData() {
            this.sendCommand(JDPacket.onlyHeader(SystemCmd.Announce))
        }

        handlePacketOuter(pkt: JDPacket) {
            if (pkt.service_command == SystemCmd.Announce)
                this.advertisementData = pkt.data

            if (pkt.service_command == SystemCmd.Event)
                this.raiseEvent(pkt.intData, pkt.data.length >= 8 ? pkt.getNumber(NumberFormat.Int32LE, 4) : undefined)

            this.handlePacket(pkt)
        }

        handlePacket(pkt: JDPacket) { }

        _attach(dev: Device, serviceNum: number) {
            if (this.device) throw "Invalid attach"
            if (!this.broadcast) {
                if (this.requiredDeviceName && this.requiredDeviceName != dev.name && this.requiredDeviceName != dev.deviceId)
                    return false // don't attach
                this.device = dev
                this.serviceNumber = serviceNum
                _unattachedClients.removeElement(this)
            }
            log(`attached ${dev.toString()}/${serviceNum} to client ${this.name}`)
            dev.clients.push(this)
            this.onAttach()
            this.config.resend()
            return true
        }

        _detach() {
            log(`dettached ${this.name}`)
            this.serviceNumber = null
            if (!this.broadcast) {
                if (!this.device) throw "Invalid detach"
                this.device = null
                _unattachedClients.push(this)
                clearAttachCache()
            }
            this.onDetach()
        }

        protected onAttach() { }
        protected onDetach() { }

        sendCommand(pkt: JDPacket) {
            this.start()
            if (this.serviceNumber == null)
                return
            pkt.service_number = this.serviceNumber
            pkt._sendCmd(this.device)
        }

        sendCommandWithAck(pkt: JDPacket) {
            this.start()
            if (this.serviceNumber == null)
                return
            pkt.service_number = this.serviceNumber
            if (!pkt._sendWithAck(this.device.deviceId))
                throw "No ACK"
        }

        // this will be re-sent on (re)attach
        setRegInt(reg: number, value: number) {
            this.start()
            this.config.send(JDPacket.jdpacked(CMD_SET_REG | reg, "i32", [value]))
        }

        setRegBuffer(reg: number, value: Buffer) {
            this.start()
            this.config.send(JDPacket.from(CMD_SET_REG | reg, value))
        }

        protected raiseEvent(value: number, argument: number) {
            control.raiseEvent(this.eventId, value)
            if (this.handlers) {
                const h = this.handlers[value + ""]
                if (h)
                    h(argument)
            }
        }

        protected registerEvent(value: number, handler: () => void) {
            this.start()
            control.onEvent(this.eventId, value, handler);
        }

        protected registerHandler(value: number, handler: (idx: number) => void) {
            this.start()
            if (!this.handlers) this.handlers = {}
            this.handlers[value + ""] = handler
        }

        protected log(text: string) {
            if (this.supressLog || jacdac.consolePriority < console.minPriority)
                return
            let dev = selfDevice().toString()
            let other = this.device ? this.device.toString() : "<unbound>"
            console.add(jacdac.consolePriority, `${dev}/${other}:${this.serviceClass}>${this.name}>${text}`);
        }

        start() {
            if (this.started) return
            this.started = true
            jacdac.start()
            _unattachedClients.push(this)
            _allClients.push(this)
            clearAttachCache()
        }

        destroy() {
            if (this.device)
                this.device.clients.removeElement(this)
            _unattachedClients.removeElement(this)
            _allClients.removeElement(this)
            this.serviceNumber = null
            this.device = null
            clearAttachCache()
        }

        announceCallback() { }
    }

    // 2 letter + 2 digit ID; 1.8%/0.3%/0.07%/0.015% collision probability among 50/20/10/5 devices
    export function shortDeviceId(devid: string) {
        const h = Buffer.fromHex(devid).hash(30)
        return String.fromCharCode(0x41 + h % 26) +
            String.fromCharCode(0x41 + Math.idiv(h, 26) % 26) +
            String.fromCharCode(0x30 + Math.idiv(h, 26 * 26) % 10) +
            String.fromCharCode(0x30 + Math.idiv(h, 26 * 26 * 10) % 10)
    }

    class RegQuery {
        lastQuery = 0
        value: Buffer
        constructor(public reg: number) { }
    }

    export class Device {
        services: Buffer
        lastSeen: number
        clients: Client[] = []
        private _name: string
        private _shortId: string
        private queries: RegQuery[]

        constructor(public deviceId: string) {
            devices_.push(this)
        }

        get isConnected() {
            return this.clients != null
        }

        get name() {
            // TODO measure if caching is worth it
            if (this._name === undefined)
                this._name = settings.readString(devNameSettingPrefix + this.deviceId) || null
            return this._name
        }

        get shortId() {
            // TODO measure if caching is worth it
            if (!this._shortId)
                this._shortId = shortDeviceId(this.deviceId)
            return this._shortId;
        }

        toString() {
            return this.shortId + (this.name ? ` (${this.name})` : ``)
        }

        private lookupQuery(reg: number) {
            if (!this.queries) this.queries = []
            return this.queries.find(q => q.reg == reg)
        }

        queryInt(reg: number, refreshRate = 1000) {
            const v = this.query(reg, refreshRate)
            if (!v) return undefined
            return intOfBuffer(v)
        }

        query(reg: number, refreshRate = 1000) {
            let q = this.lookupQuery(reg)
            if (!q)
                this.queries.push(q = new RegQuery(reg))

            const now = control.millis()
            if (!q.lastQuery ||
                (q.value === undefined && now - q.lastQuery > 500) ||
                (refreshRate != null && now - q.lastQuery > refreshRate)) {
                q.lastQuery = now
                this.sendCtrlCommand(CMD_GET_REG | reg)
            }
            return q.value
        }

        get mcuTemperature() {
            return this.queryInt(ControlReg.McuTemperature)
        }

        get firmwareVersion() {
            const b = this.query(ControlReg.FirmwareVersion, null)
            if (b) return b.toString()
            else return ""
        }

        get firmwareUrl() {
            const b = this.query(ControlReg.FirmwareUrl, null)
            if (b) return b.toString()
            else return ""
        }

        get deviceUrl() {
            const b = this.query(ControlReg.DeviceUrl, null)
            if (b) return b.toString()
            else return ""
        }

        handleCtrlReport(pkt: JDPacket) {
            if ((pkt.service_command & CMD_TYPE_MASK) == CMD_GET_REG) {
                const reg = pkt.service_command & CMD_REG_MASK
                const q = this.lookupQuery(reg)
                if (q)
                    q.value = pkt.data
            }
        }

        hasService(service_class: number) {
            for (let i = 4; i < this.services.length; i += 4)
                if (this.services.getNumber(NumberFormat.UInt32LE, i) == service_class)
                    return true
            return false
        }

        sendCtrlCommand(cmd: number, payload: Buffer = null) {
            const pkt = !payload ? JDPacket.onlyHeader(cmd) : JDPacket.from(cmd, payload)
            pkt.service_number = JD_SERVICE_NUMBER_CTRL
            pkt._sendCmd(this)
        }

        static clearNameCache() {
            for (let d of devices_)
                d._name = undefined
            clearAttachCache()
        }

        _destroy() {
            log("destroy " + this.shortId)
            for (let c of this.clients)
                c._detach()
            this.clients = null
        }
    }

    //% whenUsed
    export let onIdentifyRequest = () => {
        if (!pins.pinByCfg(DAL.CFG_PIN_LED))
            return
        for (let i = 0; i < 7; ++i) {
            setPinByCfg(DAL.CFG_PIN_LED, true)
            pause(50)
            setPinByCfg(DAL.CFG_PIN_LED, false)
            pause(150)
        }
    }

    class ControlService extends Host {
        constructor() {
            super("ctrl", 0)
        }
        handlePacketOuter(pkt: JDPacket) {
            switch (pkt.service_command) {
                case SystemCmd.Announce:
                    queueAnnounce()
                    break
                case ControlCmd.Identify:
                    control.runInParallel(onIdentifyRequest)
                    break
                case ControlCmd.Reset:
                    control.reset()
                    break
                case CMD_GET_REG | ControlReg.DeviceDescription:
                    this.sendReport(JDPacket.from(pkt.service_command, Buffer.fromUTF8("PXT: " + control.programName())))
                    break
            }
        }
    }
    export function devices() {
        return devices_.slice()
    }

    export function selfDevice() {
        if (!myDevice) {
            myDevice = new Device(control.deviceLongSerialNumber().toHex())
            myDevice.services = Buffer.create(4)
        }
        return myDevice
    }

    export function onAnnounce(cb: () => void) {
        announceCallbacks.push(cb)
    }

    export function onNewDevice(cb: () => void) {
        if (!newDeviceCallbacks) newDeviceCallbacks = []
        newDeviceCallbacks.push(cb)
    }

    export function onRawPacket(cb: (pkt: JDPacket) => void) {
        if (!pktCallbacks) pktCallbacks = []
        pktCallbacks.push(cb)
    }

    function queueAnnounce() {
        const fmt = "<" + hostServices.length + "I"
        const ids = hostServices.map(h => h.running ? h.serviceClass : -1)
        if (restartCounter < 0xf) restartCounter++
        ids[0] = restartCounter | 0x100
        JDPacket.packed(SystemCmd.Announce, fmt, ids)
            ._sendReport(selfDevice())
        announceCallbacks.forEach(f => f())
        for (const cl of _allClients)
            cl.announceCallback()
        gcDevices()
    }

    function clearAttachCache() {
        for (let d of devices_) {
            // add a dummy byte at the end (if not done already), to force re-attach of services
            if (d.services && (d.services.length & 3) == 0)
                d.services = d.services.concat(Buffer.create(1))
        }
    }

    function newDevice() {
        if (newDeviceCallbacks)
            for (let f of newDeviceCallbacks)
                f()
    }

    function reattach(dev: Device) {
        log(`reattaching services to ${dev.toString()}; cl=${_unattachedClients.length}/${_allClients.length}`)
        const newClients: Client[] = []
        const occupied = Buffer.create(dev.services.length >> 2)
        for (let c of dev.clients) {
            if (c.broadcast) {
                c._detach()
                continue // will re-attach
            }
            const newClass = dev.services.getNumber(NumberFormat.UInt32LE, c.serviceNumber << 2)
            if (newClass == c.serviceClass && (!c.requiredDeviceName || c.requiredDeviceName == dev.name)) {
                newClients.push(c)
                occupied[c.serviceNumber] = 1
            } else {
                c._detach()
            }
        }
        dev.clients = newClients

        newDevice()

        if (_unattachedClients.length == 0)
            return

        for (let i = 4; i < dev.services.length; i += 4) {
            if (occupied[i >> 2])
                continue
            const service_class = dev.services.getNumber(NumberFormat.UInt32LE, i)
            for (let cc of _unattachedClients) {
                if (cc.serviceClass == service_class) {
                    if (cc._attach(dev, i >> 2))
                        break
                }
            }
        }
    }

    function serviceMatches(dev: Device, serv: Buffer) {
        const ds = dev.services
        if (!ds || ds.length != serv.length)
            return false
        for (let i = 4; i < serv.length; ++i)
            if (ds[i] != serv[i])
                return false
        return true
    }

    export function routePacket(pkt: JDPacket) {
        // log("route: " + pkt.toString())
        const devId = pkt.device_identifier
        const multiCommandClass = pkt.multicommand_class

        // TODO implement send queue for packet compression

        if (pkt.requires_ack) {
            pkt.requires_ack = false // make sure we only do it once
            if (pkt.device_identifier == selfDevice().deviceId) {
                const crc = pkt.crc
                const ack = JDPacket.onlyHeader(crc)
                ack.service_number = JD_SERVICE_NUMBER_CRC_ACK
                ack._sendReport(selfDevice())
            }
        }

        if (pktCallbacks)
            for (let f of pktCallbacks)
                f(pkt)

        if (multiCommandClass != null) {
            if (!pkt.is_command)
                return // only commands supported in multi-command
            const h = hostServices.find(s => s.serviceClass == multiCommandClass);
            if (h && h.running) {
                // pretend it's directly addressed to us
                pkt.device_identifier = selfDevice().deviceId
                pkt.service_number = h.serviceNumber
                h.handlePacketOuter(pkt)
            }
        } else if (devId == selfDevice().deviceId) {
            if (!pkt.is_command)
                return // huh? someone's pretending to be us?
            const h = hostServices[pkt.service_number]
            if (h && h.running) {
                // log(`handle pkt at ${h.name} cmd=${pkt.service_command}`)
                h.handlePacketOuter(pkt)
            }
        } else {
            if (pkt.is_command)
                return // it's a command, and it's not for us

            let dev = devices_.find(d => d.deviceId == devId)

            if (pkt.service_number == JD_SERVICE_NUMBER_CTRL) {
                if (pkt.service_command == SystemCmd.Announce) {
                    if (dev && (dev.services[0] & 0xf) > (pkt.data[0] & 0xf)) {
                        // if the reset counter went down, it means the device resetted; treat it as new device
                        devices_.removeElement(dev)
                        dev._destroy()
                        dev = null
                    }

                    if (!dev)
                        dev = new Device(pkt.device_identifier)

                    const matches = serviceMatches(dev, pkt.data)
                    dev.services = pkt.data
                    if (!matches) {
                        dev.lastSeen = control.millis()
                        reattach(dev)
                    }
                }
                if (dev) {
                    dev.handleCtrlReport(pkt)
                    dev.lastSeen = control.millis()
                }
                return
            } else if (pkt.service_number == JD_SERVICE_NUMBER_CRC_ACK) {
                _gotAck(pkt)
            }

            if (!dev)
                // we can't know the service_class, no announcement seen yet for this device
                return

            dev.lastSeen = control.millis()

            const service_class = dev.services.getNumber(NumberFormat.UInt32LE, pkt.service_number << 2)
            if (!service_class || service_class == 0xffffffff)
                return

            const client = dev.clients.find(c =>
                c.broadcast
                    ? c.serviceClass == service_class
                    : c.serviceNumber == pkt.service_number)
            if (client) {
                // log(`handle pkt at ${client.name} rep=${pkt.service_command}`)
                client.currentDevice = dev
                client.handlePacketOuter(pkt)
            }
        }
    }

    function gcDevices() {
        const cutoff = control.millis() - 2000
        let numdel = 0
        for (let i = 0; i < devices_.length; ++i) {
            const dev = devices_[i]
            if (dev.lastSeen < cutoff) {
                devices_.splice(i, 1)
                i--
                dev._destroy()
                numdel++
            }
        }
        if (numdel)
            newDevice()
    }

    const EVT_DATA_READY = 1
    const CFG_PIN_JDPWR_OVERLOAD_LED = 1103
    const CFG_PIN_JDPWR_ENABLE = 1104
    const CFG_PIN_JDPWR_FAULT = 1105

    function setPinByCfg(cfg: number, val: boolean) {
        const pin = pins.pinByCfg(cfg)
        if (!pin)
            return
        if (control.getConfigValue(cfg, 0) & DAL.CFG_PIN_CONFIG_ACTIVE_LO)
            val = !val
        pin.digitalWrite(val)
    }

    export function enablePower(enabled = true) {
        // EN active-lo, AP2552A, AP22652A, TPS2552-1
        // EN active-hi, AP2553A, AP22653A, TPS2553-1
        setPinByCfg(CFG_PIN_JDPWR_ENABLE, enabled)
    }

    export function start(): void {
        if (hostServices)
            return // already started

        log("jacdac starting")

        hostServices = []
        new ControlService().start()
        _unattachedClients = []
        _allClients = []
        jacdac.__physStart();
        control.internalOnEvent(jacdac.__physId(), EVT_DATA_READY, () => {
            let buf: Buffer;
            while (null != (buf = jacdac.__physGetPacket())) {
                const pkt = JDPacket.fromBinary(buf)
                pkt.timestamp = jacdac.__physGetTimestamp()
                routePacket(pkt)
            }
        });
        control.internalOnEvent(jacdac.__physId(), 100, queueAnnounce);

        enablePower(true)
        const faultpin = pins.pinByCfg(CFG_PIN_JDPWR_FAULT)
        if (faultpin) {
            // FAULT is always assumed to be active-low; no external pull-up is needed
            // (and you should never pull it up to +5V!)
            faultpin.setPull(PinPullMode.PullUp)
            faultpin.digitalRead()
            onAnnounce(() => {
                if (faultpin.digitalRead() == false) {
                    control.runInBackground(() => {
                        control.dmesg("jacdac power overload; restarting power")
                        enablePower(false)
                        setPinByCfg(CFG_PIN_JDPWR_OVERLOAD_LED, true)
                        pause(200) // wait some time for the LED to be noticed; also there's some de-glitch time on EN
                        setPinByCfg(CFG_PIN_JDPWR_OVERLOAD_LED, false)
                        enablePower(true)
                    })
                }
            })
        }

        console.addListener(function (pri, msg) {
            if (msg[0] != ":")
                loggerHost.add(pri as number, msg);
        });
        loggerHost.start()
    }

    export function diagnostics(): jacdac.JDDiagnostics {
        return new jacdac.JDDiagnostics(jacdac.__physGetDiagnostics());
    }

    export class JDDiagnostics {
        bus_state: number;
        bus_lo_error: number;
        bus_uart_error: number;
        bus_timeout_error: number;
        packets_sent: number;
        packets_received: number;
        packets_dropped: number;

        constructor(buf: Buffer) {
            if (!buf) return;

            [
                this.bus_state,
                this.bus_lo_error,
                this.bus_uart_error,
                this.bus_timeout_error,
                this.packets_sent,
                this.packets_received,
                this.packets_dropped
            ] = pins.unpackBuffer("7I", buf)
        }
    }
}