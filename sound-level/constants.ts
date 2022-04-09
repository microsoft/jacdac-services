namespace jacdac {
    // Service Sound level constants
    export const SRV_SOUND_LEVEL = 0x14ad1a5d
    export const enum SoundLevelReg {
        /**
         * Read-only ratio u0.16 (uint16_t). The sound level detected by the microphone
         *
         * ```
         * const [soundLevel] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        SoundLevel = 0x101,

        /**
         * Read-write bool (uint8_t). Turn on or off the microphone.
         *
         * ```
         * const [enabled] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        Enabled = 0x1,

        /**
         * Read-write ratio u0.16 (uint16_t). The sound level to trigger a loud event.
         *
         * ```
         * const [loudThreshold] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        LoudThreshold = 0x6,

        /**
         * Read-write ratio u0.16 (uint16_t). The sound level to trigger a quiet event.
         *
         * ```
         * const [quietThreshold] = jdunpack<[number]>(buf, "u0.16")
         * ```
         */
        QuietThreshold = 0x5,
    }

    export const enum SoundLevelRegPack {
        /**
         * Pack format for 'sound_level' register data.
         */
        SoundLevel = "u0.16",

        /**
         * Pack format for 'enabled' register data.
         */
        Enabled = "u8",

        /**
         * Pack format for 'loud_threshold' register data.
         */
        LoudThreshold = "u0.16",

        /**
         * Pack format for 'quiet_threshold' register data.
         */
        QuietThreshold = "u0.16",
    }

    export const enum SoundLevelEvent {
        /**
         * Raised when a loud sound is detected
         */
        //% block="loud"
        Loud = 0x1,

        /**
         * Raised when a period of quietness is detected
         */
        //% block="quiet"
        Quiet = 0x2,
    }
}
