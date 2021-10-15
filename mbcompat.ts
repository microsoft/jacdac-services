namespace control {
    /**
     * Used internally
     */
    //% flags.defl=0 shim=control::onEvent
    export declare function internalOnEvent(
        src: number,
        value: number,
        handler: () => void,
        flags?: number
    ): void

    export function getConfigValue(key: number, defl: number): number {
        return defl
    }
}

namespace pins {
    export function pinByCfg(key: number): DigitalInOutPin {
        return null
    }
}

let identifyAnimationRunning = false
function identifyAnimation() {
    if (identifyAnimationRunning) return

    identifyAnimationRunning = true
    const sc = led.screenshot()
    control.runInParallel(() => {
        led.stopAnimation()
        basic.showAnimation(
            `00000 00000 00000  00000 00000  00000
        ####0 00000 ####0  00000 ####0  00000 
        ####0 00000 ####0  00000 ####0  00000 
        ###00 00000 ###00  00000 ###00  00000 
        00000 00000 00000  00000 00000  00000`,
            250
        )
        sc.plotFrame(0)
        identifyAnimationRunning = false
    })
}

function handleStatusEvent(event: jacdac.StatusEvent) {
    switch (event) {
        case jacdac.StatusEvent.ProxyStarted:
            identifyAnimation()
            break
        case jacdac.StatusEvent.ProxyPacketReceived:
            // it looks like if we queue *two* plotLeds() when animation is running, one of them never finishes
            if (!identifyAnimationRunning)
                basic.plotLeds(`
                    . . . . .
                    # # # # .
                    # # # # .
                    # # # . .
                    . . . . .
                `)
            break
        case jacdac.StatusEvent.Identify:
            identifyAnimation()
            break
    }
}

/**
 * Initialize Jacdac for micro:bit V2
 */
//% parts=v2
function initPlatform() {
    // don't use any jacdac static - it isn't initialized here yet in sim (pxt bug)
    jacdac.onPlatformStart = function () {
        jacdac.productIdentifier = 0x32f6253d
        jacdac.bus.on(jacdac.STATUS_EVENT, handleStatusEvent)
        if (settings.exists(jacdac.JACDAC_PROXY_SETTING)) {
            const reset = () => control.reset()
            input.onButtonPressed(Button.A, reset)
            input.onButtonPressed(Button.B, reset)
        }
    }
}
initPlatform()
