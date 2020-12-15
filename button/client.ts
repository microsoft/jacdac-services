namespace modules {
    const INTERNAL_KEY_UP = 2050;
    const INTERNAL_KEY_DOWN = 2051;

    //% fixedInstances
    export class ButtonClient extends jacdac.SensorClient {
        constructor(requiredDevice: string = null) {
            super("btn", SRV_BUTTON, requiredDevice);
        }

        connectControllerButton(controllerButton: number) {
            this.start()
            control.internalOnEvent(this.eventId, ButtonEvent.Down,
                () => control.raiseEvent(INTERNAL_KEY_DOWN, controllerButton))
            control.internalOnEvent(this.eventId, ButtonEvent.Up,
                () => control.raiseEvent(INTERNAL_KEY_UP, controllerButton))
        }

        /**
         * Reads the current x value from the sensor
         */
        //% blockId=jacadacbtispressed block="jacdac %button is pressed"
        //% group="Buttons"
        isPressed(): boolean {
            const s = this.state;
            if (!s || s.length < 1) return false;
            return !!s.getNumber(NumberFormat.UInt8LE, 0);
        }

        /**
         * Runs code when an event happens on the sensor
         * @param gesture 
         * @param handler 
         */
        //% blockId=jacadacbtnonevent block="jacdac %button on %event"
        //% group="Buttons"
        onEvent(event: jacdac.ButtonEvent, handler: () => void) {
            this.registerEvent(event, handler);
        }
    }

    //% fixedInstance whenUsed block="button client"
    export const buttonClient = new ButtonClient();
}