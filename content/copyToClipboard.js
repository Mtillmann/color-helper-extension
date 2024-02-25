// from https://github.com/vuejs/vitepress/blob/006fd800956de5f12f63980e854239c240a70203/src/client/app/composables/copyCode.ts#L45C1-L87C2
// downgraded to js
async function copyToClipboard(text) {
    try {
        return navigator.clipboard.writeText(text)
    } catch {
        const element = document.createElement('textarea')
        const previouslyFocusedElement = document.activeElement

        element.value = text

        // Prevent keyboard from showing on mobile
        element.setAttribute('readonly', '')

        element.style.contain = 'strict'
        element.style.position = 'absolute'
        element.style.left = '-9999px'
        element.style.fontSize = '12pt' // Prevent zooming on iOS

        const selection = document.getSelection()
        const originalRange = selection
            ? selection.rangeCount > 0 && selection.getRangeAt(0)
            : null

        document.body.appendChild(element)
        element.select()

        // Explicit selection workaround for iOS
        element.selectionStart = 0
        element.selectionEnd = text.length

        document.execCommand('copy')
        document.body.removeChild(element)


        if (selection && originalRange) {
            selection.removeAllRanges();
            selection.addRange(originalRange);
        }

        // Get the focus back on the previously focused element, if any
        if (previouslyFocusedElement) {
            previouslyFocusedElement.focus();
        }
    }
}