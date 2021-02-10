namespace jacdac {
    // Service: Gyroscope
    export const SRV_GYROSCOPE = 0x1e1b06f2
    export const enum GyroscopeReg {
        /**
         * Indicates the current forces acting on accelerometer.
         *
         * ```
         * const [x, y, z] = jdunpack<[number, number, number]>(buf, "i16.16 i16.16 i16.16")
         * ```
         */
        RotationRates = 0x101,

        /**
         * Read-only °/s i16.16 (int32_t). Error on the reading value.
         *
         * ```
         * const [rotationRatesError] = jdunpack<[number]>(buf, "i16.16")
         * ```
         */
        RotationRatesError = 0x106,

        /**
         * Read-write °/s i16.16 (int32_t). Configures the range of range of rotation rates.
         *
         * ```
         * const [maxRate] = jdunpack<[number]>(buf, "i16.16")
         * ```
         */
        MaxRate = 0x80,
    }

}
