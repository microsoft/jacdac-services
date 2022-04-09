namespace jacdac {
    // Service LED constants
    export const SRV_LED = 0x1e3048f8

    export const enum LedVariant { // uint8_t
        //% block="through hole"
        ThroughHole = 0x1,
        //% block="smd"
        SMD = 0x2,
        //% block="power"
        Power = 0x3,
        //% block="bead"
        Bead = 0x4,
    }

    export const enum LedCmd {
        /**
         * This has the same semantics as `set_status_light` in the control service.
         *
         * ```
         * const [toRed, toGreen, toBlue, speed] = jdunpack<[number, number, number, number]>(buf, "u8 u8 u8 u8")
         * ```
         */
        Animate = 0x80,
    }

    export const enum LedCmdPack {
        /**
         * Pack format for 'animate' register data.
         */
        Animate = "u8 u8 u8 u8",
    }

    export const enum LedReg {
        /**
         * The current color of the LED.
         *
         * ```
         * const [red, green, blue] = jdunpack<[number, number, number]>(buf, "u8 u8 u8")
         * ```
         */
        Color = 0x180,

        /**
         * Read-write mA uint16_t. Limit the power drawn by the light-strip (and controller).
         *
         * ```
         * const [maxPower] = jdunpack<[number]>(buf, "u16")
         * ```
         */
        MaxPower = 0x7,

        /**
         * Constant uint16_t. If known, specifies the number of LEDs in parallel on this device.
         *
         * ```
         * const [ledCount] = jdunpack<[number]>(buf, "u16")
         * ```
         */
        LedCount = 0x183,

        /**
         * Constant nm uint16_t. If monochrome LED, specifies the wave length of the LED.
         *
         * ```
         * const [waveLength] = jdunpack<[number]>(buf, "u16")
         * ```
         */
        WaveLength = 0x181,

        /**
         * Constant mcd uint16_t. The luminous intensity of the LED, at full value, in micro candella.
         *
         * ```
         * const [luminousIntensity] = jdunpack<[number]>(buf, "u16")
         * ```
         */
        LuminousIntensity = 0x182,

        /**
         * Constant Variant (uint8_t). The physical type of LED.
         *
         * ```
         * const [variant] = jdunpack<[jacdac.LedVariant]>(buf, "u8")
         * ```
         */
        Variant = 0x107,
    }

    export const enum LedRegPack {
        /**
         * Pack format for 'color' register data.
         */
        Color = "u8 u8 u8",

        /**
         * Pack format for 'max_power' register data.
         */
        MaxPower = "u16",

        /**
         * Pack format for 'led_count' register data.
         */
        LedCount = "u16",

        /**
         * Pack format for 'wave_length' register data.
         */
        WaveLength = "u16",

        /**
         * Pack format for 'luminous_intensity' register data.
         */
        LuminousIntensity = "u16",

        /**
         * Pack format for 'variant' register data.
         */
        Variant = "u8",
    }
}
