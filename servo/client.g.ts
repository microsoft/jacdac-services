namespace modules {
    /**
     * Servo is a small motor with arm that can be pointing at a specific direction.
     **/
    //% fixedInstances blockGap=8
    export class ServoClient extends jacdac.Client {

            private readonly _enabled : jacdac.RegisterClient<[boolean]>;
            private readonly _angle : jacdac.RegisterClient<[number]>;            

            constructor(role: string) {
            super(jacdac.SRV_SERVO, role);

            this._enabled = this.addRegister<[boolean]>(jacdac.ServoReg.Enabled, "u8");
            this._angle = this.addRegister<[number]>(jacdac.ServoReg.Angle, "i16.16");            
        }
    

        /**
        * Turn the power to the servo on/off.
        */
        //% group="Servo" blockSetVariable=myModule
        //% blockCombine block="enabled" callInDebugger
        get enabled(): boolean {            
            const values = this._enabled.pauseUntilValues() as any[];
            return !!values[0];
        }
        /**
        * Turn the power to the servo on/off.
        */
        //% group="Servo" blockSetVariable=myModule
        //% blockCombine block="enabled" callInDebugger
        set enabled(value: boolean) {
            const values = this._enabled.values as any[];
            values[0] = value ? 1 : 0;
            this._enabled.values = values as [boolean];
        }
        /**
        * Specifies the angle of the arm.
        */
        //% group="Servo" blockSetVariable=myModule
        //% blockCombine block="angle" callInDebugger
        get angle(): number {            
            const values = this._angle.pauseUntilValues() as any[];
            return values[0];
        }
        /**
        * Specifies the angle of the arm.
        */
        //% group="Servo" blockSetVariable=myModule
        //% blockCombine block="angle" callInDebugger
        set angle(value: number) {
            const values = this._angle.values as any[];
            values[0] = value;
            this._angle.values = values as [number];
        } 

    }
    //% fixedInstance whenUsed
    export const servo = new ServoClient("servo");
}