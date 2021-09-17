forever(() => {
    basic.showIcon(IconNames.Heart)
    const cols = modules.dotMatrix1.columns()
    const rows = modules.dotMatrix1.rows()
    for (let x = 0; x < cols; ++x) {
        for (let y = 0; y < rows; ++y) {
            led.toggle(x, y)
            modules.dotMatrix1.toggleDot(x, y)
            pause(50)
        }
    }
})
