namespace modules {
    /**
     * Health and diagnostics information about the Azure Iot Hub connection.
     **/
    //% fixedInstances blockGap=8
    export class AzureIotHubHealthClient extends jacdac.Client {

        private readonly _hubName : jacdac.RegisterClient<[string]>;
        private readonly _hubDeviceId : jacdac.RegisterClient<[string]>;
        private readonly _connectionStatus : jacdac.RegisterClient<[jacdac.AzureIotHubHealthConnectionStatus]>;            

        constructor(role: string) {
            super(jacdac.SRV_AZURE_IOT_HUB_HEALTH, role)

            this._hubName = this.addRegister<[string]>(jacdac.AzureIotHubHealthReg.HubName, jacdac.AzureIotHubHealthRegPack.HubName)
            this._hubDeviceId = this.addRegister<[string]>(jacdac.AzureIotHubHealthReg.HubDeviceId, jacdac.AzureIotHubHealthRegPack.HubDeviceId)
            this._connectionStatus = this.addRegister<[jacdac.AzureIotHubHealthConnectionStatus]>(jacdac.AzureIotHubHealthReg.ConnectionStatus, jacdac.AzureIotHubHealthRegPack.ConnectionStatus)            
        }
    

        /**
        * Something like `my-iot-hub.azure-devices.net` if available.
        */
        //% callInDebugger
        //% group="Iot"
        //% weight=100
        hubName(): string {
            this.start();            
            const values = this._hubName.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Device identifier in Azure Iot Hub if available.
        */
        //% callInDebugger
        //% group="Iot"
        //% weight=99
        hubDeviceId(): string {
            this.start();            
            const values = this._hubDeviceId.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Indicates the status of connection. A message beyond the [0..3] range represents an HTTP error code.
        */
        //% callInDebugger
        //% group="Iot"
        //% weight=98
        connectionStatus(): jacdac.AzureIotHubHealthConnectionStatus {
            this.start();            
            const values = this._connectionStatus.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Register code to run when an event is raised
         */
        //% group="Iot"
        //% blockId=jacdac_on_azureiothubhealth_event
        //% block="on %azureiothubhealth %event"
        //% weight=97
        onEvent(ev: jacdac.AzureIotHubHealthEvent, handler: () => void): void {
            this.registerEvent(ev, handler);
        }

        /**
         * Raised when the connection status changes
         */
        //% group="Iot"
        //% weight=96
        onConnectionStatusChange(handler: () => void): void {
            this.registerEvent(jacdac.AzureIotHubHealthEvent.ConnectionStatusChange, handler);
        }
        /**
         * Raised when a message has been sent to the hub.
         */
        //% group="Iot"
        //% weight=95
        onMessageSent(handler: () => void): void {
            this.registerEvent(jacdac.AzureIotHubHealthEvent.MessageSent, handler);
        }

        /**
        * Starts a connection to the IoT hub service
        */
        //% group="Iot"
        //% blockId=jacdac_azureiothubhealth_connect_cmd
        //% block="%azureiothubhealth connect"
        //% weight=94
        connect(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.AzureIotHubHealthCmd.Connect))
        }

        /**
        * Starts disconnecting from the IoT hub service
        */
        //% group="Iot"
        //% blockId=jacdac_azureiothubhealth_disconnect_cmd
        //% block="%azureiothubhealth disconnect"
        //% weight=93
        disconnect(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.AzureIotHubHealthCmd.Disconnect))
        }
    
    }
    //% fixedInstance whenUsed weight=1 block="azure iot hub health1"
    export const azureIotHubHealth1 = new AzureIotHubHealthClient("azure Iot Hub Health1");
}