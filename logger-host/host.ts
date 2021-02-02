namespace jacdac {
    export class LoggerHost extends Host {
        private _lastListenerTime: number = 0;
        minPriority = LoggerPriority.Silent;

        constructor() {
            super("conh", SRV_LOGGER);
            this._lastListenerTime = 0;
        }

        handlePacket(packet: JDPacket) {
            this.minPriority = this.handleRegValue(packet, LoggerReg.MinPriority, "u8", this.minPriority);
            // TODO: is this a command?
            const SetMinPriority = 0x2000 | LoggerReg.MinPriority
            switch (packet.serviceCommand) {
                case SetMinPriority:
                    const now = control.millis()
                    // lower the priority immediately, but tighten it only when no one 
                    // was asking for lower one for some time
                    const d = packet.intData
                    const elapsed = now - this._lastListenerTime
                    if (d <= this.minPriority ||
                        elapsed > 1500) {
                        this.minPriority = d
                        this._lastListenerTime = now
                    }
                    break;
                default:
                    break;
            }
        }

        debug(message: string): void {
            this.add(LoggerPriority.Debug, message);
        }
        log(message: string): void {
            this.add(LoggerPriority.Log, message);
        }
        warn(message: string): void {
            this.add(LoggerPriority.Warning, message);
        }
        error(message: string): void {
            this.add(LoggerPriority.Error, message);
        }

        add(priority: LoggerPriority, message: string): void {
            if (!message || !message.length || priority < this.minPriority
                || !this._lastListenerTime)
                return;

            // no one listening?
            if (control.millis() - this._lastListenerTime > 3000) {
                this._lastListenerTime = 0;
                return;
            }

            for (let buf of Buffer.chunkedFromUTF8(message, JD_SERIAL_MAX_PAYLOAD_SIZE)) {
                this.sendReport(JDPacket.from(LoggerPriority.Debug + priority, buf))
            }
        }
    }

    //% whenUsed
    export const loggerHost = new LoggerHost()
}