namespace jacdac {
    // Service Air Pressure constants
    export const SRV_AIR_PRESSURE = 0x1e117cea
    export const enum AirPressureReg {
        /**
         * Read-only hPa u22.10 (uint32_t). The air pressure.
         *
         * ```
         * const [pressure] = jdunpack<[number]>(buf, "u22.10")
         * ```
         */
        Pressure = 0x101,

        /**
         * Read-only hPa u22.10 (uint32_t). The real pressure is between `pressure - pressure_error` and `pressure + pressure_error`.
         *
         * ```
         * const [pressureError] = jdunpack<[number]>(buf, "u22.10")
         * ```
         */
        PressureError = 0x106,
    }

    export const enum AirPressureRegPack {
        /**
         * Pack format for 'pressure' register data.
         */
        Pressure = "u22.10",

        /**
         * Pack format for 'pressure_error' register data.
         */
        PressureError = "u22.10",
    }
}
