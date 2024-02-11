// only used for local development... actual default groups are set in the background script (background/index.js)
export default [
    {
        name: "Colors & Shades",
        items: [
            {
                icon: 'PICKER',
                action: "Selection",
                shortcut: "Ctrl + Shift + C",
                show: true
            },
            {
                icon: 'PICKER',
                action: "DOM Element",
                shortcut: "Ctrl + Shift + C",
                show: true
            },
            {
                icon: 'PICKER',
                action: "Viewport",
                shortcut: "Ctrl + Shift + C",
                show: true
            }

        ]
    },
    {
        name: "Charts & Graphs",
        items: [
            {
                icon: 'CHART',
                action: "Selection",
                shortcut: "Ctrl + Shift + C",
                show: true
            },
            {
                icon: 'CHART',
                action: "DOM Element",
                shortcut: "Ctrl + Shift + C",
                show: true
            },
            {
                icon: 'CHART',
                action: "Viewport",
                shortcut: "Ctrl + Shift + C",
                show: true
            }

        ]
    },{
        name: "Settings",
        items: [
            {
                icon: 'GEAR',
                color : "secondary",
                show: true
            }
        ]
    }
]