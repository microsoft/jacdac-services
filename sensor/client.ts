namespace jacdac {
    //% fixedInstances
    //% weight=1
    export class SensorClient<TReading extends PackSimpleDataType[]> extends Client {
        protected readonly _reading: RegisterClient<TReading>
        private _stateChangedHandler: () => void;

        public isStreaming = false

        constructor(deviceClass: number, role: string, stateFormat: string) {
            super(deviceClass, role);
            this._reading = this.addRegister(SystemReg.Reading, stateFormat)
        }

        announceCallback() {
            if (this.isStreaming)
                this.setReg(SystemReg.StreamingSamples, "u8", [this.isStreaming ? 255 : 0])
        }

        /**
         * Enables or disable streaming the sensor internal state
         * @param on streaming enabled
         */
        public setStreaming(on: boolean, interval?: number) {
            this.start();
            this.isStreaming = on
            this.setReg(SystemReg.StreamingSamples, "u8", [this.isStreaming ? 255 : 0])
            if (interval != undefined)
                this.setReg(SystemReg.StreamingInterval, "u32", [interval])
        }

        /**
         * Requests the sensor to calibrate
         */
        public calibrate() {
            this.sendCommand(JDPacket.onlyHeader(SystemCmd.Calibrate))
        }

        public onStateChanged(handler: () => void) {
            this._reading.onDataChanged(handler);
            this.start();
        }
    }

    export class BufferedSensorClient<TReading extends (string | number | Buffer)[]> extends SensorClient<TReading> {
        protected _samples: TReading[]
        protected _numSamples: number
        protected _interval: number
        protected _lastTimestamp: number

        constructor(deviceClass: number, role: string, stateFormat: string) {
            super(deviceClass, role, stateFormat);
        }

        enableBuffer(numSamples: number, interval: number) {
            this._numSamples = numSamples
            this._samples = []
            this._interval = interval
            this.setStreaming(true, interval)
        }

        getSamples() {
            if (!this._samples || this._samples.length < this._numSamples)
                return null
            return this._samples.slice(-this._numSamples)
        }

        handlePacket(packet: JDPacket) {
            if (this._samples && packet.serviceCommand == (CMD_GET_REG | SystemReg.Reading)) {
                const v = jdunpack(packet.data, this._reading.packFormat) as TReading;
                if (v != null) {
                    let num = 1
                    if (this._lastTimestamp != undefined) {
                        const d = packet.timestamp - this._lastTimestamp
                        num = Math.idiv(d + (this._interval >> 1), this._interval)
                        num = Math.clamp(1, 5, num)
                    }
                    this._lastTimestamp = packet.timestamp
                    while (num--)
                        this._samples.push(v)
                    const del = this._samples.length - this._numSamples
                    if (del > 5)
                        this._samples.splice(0, del)
                }
            }
            super.handlePacket(packet)
        }
    }
}