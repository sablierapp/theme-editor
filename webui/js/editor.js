const defaultData = JSON.stringify({
    "DisplayName": "my sablier session",
    "InstanceStates": [
        {
            "Name": "nginx",
            "Status": "ready",
            "Error": null,
            "CurrentReplicas": 1,
            "DesiredReplicas": 1,
            "Provider": "docker",
            "Docker": {
                "id": "a1b2c3d4e5f6",
                "image": "nginx:latest"
            }
        },
        {
            "Name": "vscode",
            "Status": "starting",
            "Error": null,
            "CurrentReplicas": 0,
            "DesiredReplicas": 1,
            "Provider": "docker",
            "Docker": {
                "id": "b2c3d4e5f6a1",
                "image": "codercom/code-server:latest"
            }
        },
        {
            "Name": "mongodb",
            "Status": "error",
            "Error": "container mongodb is unhealthy",
            "CurrentReplicas": 0,
            "DesiredReplicas": 1,
            "Provider": "docker",
            "Docker": {
                "id": "c3d4e5f6a1b2",
                "image": "mongo:latest"
            }
        }
    ],
    "SessionDuration": "10 minutes",
    "RefreshFrequency": "5",
    "Version": "1.18.0"
}, null, 2)

const go = new Go();
WebAssembly.instantiateStreaming(fetch("/scripts/template.wasm"), go.importObject).then((result) => {
    go.run(result.instance);
    loadEditors()
});
function render() {
    var output = template(ace.edit("input-editor").getValue(), ace.edit("data-editor").getValue());
    var frame = document.getElementById('output')
    var oldSrc = frame.src
    frame.src = ''; // Clear the current content
    setTimeout(() => {
        // Create a Blob URL for the code and set it as the iframe's source
        const blob = new Blob([output], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        frame.src = url; // Load new code into the iframe

        if (oldSrc) {
            console.log("Clearing old object:" + oldSrc)
            URL.revokeObjectURL(oldSrc);
        }
    }, 0); // Delay to allow the iframe to clear
}
function loadFromLocalStorage() {
    var input_editor = ace.edit("input-editor");
    var value = localStorage.getItem("input_editor");
    if (typeof value == "string") {
        input_editor.session.setValue(value);
    } else {
        loadFromGithub("hacker-terminal")
    }

    var data_editor = ace.edit("data-editor");
    value = localStorage.getItem("data_editor");
    if (typeof value == "string") {
        data_editor.session.setValue(value);
    } else {
        data_editor.session.setValue(defaultData);
    }
}

// Themes shown when the list cannot be fetched from GitHub
const fallbackThemes = ["ghost", "hacker-terminal", "matrix", "retro", "shuffle"]

function highlightTheme() {
    var current = localStorage.getItem("theme")
    document.querySelectorAll("#theme-buttons [data-theme]").forEach(button => {
        button.setAttribute("aria-pressed", button.dataset.theme === current)
    })
}

function loadThemeButtons() {
    fetch("https://api.github.com/repos/sablierapp/sablier/contents/pkg/theme/embedded?ref=main")
        .then(response => response.ok ? response.json() : Promise.reject(response.status))
        .then(files => files
            .filter(file => file.type === "file" && file.name.endsWith(".html"))
            .map(file => file.name.slice(0, -".html".length)))
        .then(themes => themes.length > 0 ? themes : fallbackThemes)
        .catch(() => fallbackThemes)
        .then(themes => {
            document.getElementById("theme-buttons").replaceChildren(...themes.map(theme => {
                var button = document.createElement("button")
                button.dataset.theme = theme
                button.textContent = theme
                button.title = `Replace the template with the ${theme} theme`
                return button
            }))
            highlightTheme()
        })
}

function loadFromGithub(theme) {
    fetch(`https://raw.githubusercontent.com/sablierapp/sablier/refs/heads/main/pkg/theme/embedded/${theme}.html`)
        .then(value => value.text().then(body => {
            ace.edit("input-editor").setValue(body, -1) // -1: cursor at start, nothing selected
            localStorage.setItem("theme", theme)
            highlightTheme()
        }))
}
function saveInputToLocalStorage() {
    var input_editor = ace.edit("input-editor");
    localStorage.setItem(
        "input_editor",
        input_editor.session.getValue()
    );
}
function saveDataToLocalStorage() {
    var data_editor = ace.edit("data-editor");
    localStorage.setItem(
        "data_editor",
        data_editor.session.getValue()
    );
}
function formatDataEditor() {
    var data_editor = ace.edit("data-editor");
    var current = data_editor.session.getValue()
    var formatted = JSON.stringify(JSON.parse(current), null, 2)
    data_editor.session.setValue(formatted)
}
function resetDataEditor() {
    var data_editor = ace.edit("data-editor");
    data_editor.session.setValue(defaultData);
}
function fullscreenPreview() {
    var frame = document.getElementById("output")
    if (!document.fullscreenEnabled) {
        // e.g. Safari on iPhone, where only video elements can go fullscreen
        window.open(frame.src, "_blank")
        return
    }
    frame.requestFullscreen()
}
function loadEditors() {
    var input_editor = ace.edit("input-editor");
    input_editor.setTheme("ace/theme/github_dark");
    input_editor.session.setMode("ace/mode/html");
    input_editor.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true
    })
    input_editor.session.on('change', function (delta) {
        // delta.start, delta.end, delta.lines, delta.action
        render()
        saveInputToLocalStorage()
    });

    var data_editor = ace.edit("data-editor");
    data_editor.setTheme("ace/theme/github_dark");
    data_editor.session.setMode("ace/mode/json");
    data_editor.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true
    })
    data_editor.session.on('change', function (delta) {
        // delta.start, delta.end, delta.lines, delta.action
        render()
        saveDataToLocalStorage()
    })

    // Create a language provider from CDN
    var provider = LanguageProvider.fromCdn("https://www.unpkg.com/ace-linters@latest/build/");

    // Register the editor with the language provider
    provider.registerEditor(data_editor);
    provider.setGlobalOptions("json", {
        schemas: [
            {
                uri: `${window.location.href}theme.schema.json`,
            }
        ]
    });
    provider.setSessionOptions(data_editor.session, {
        schemaUri: `${window.location.href}theme.schema.json`
    });

    loadFromLocalStorage()
}

// Panel contents by component name, kept so they can be re-attached when
// the layout is rebuilt
const panels = {
    template: document.getElementById("panel-template"),
    data: document.getElementById("panel-data"),
    preview: document.getElementById("panel-preview"),
}

function applyDefaultLayout(layout) {
    var container = document.getElementById("layout")
    layout.clear()
    layout.addPanel({ id: "template", component: "template", title: "Template" })
    layout.addPanel({
        id: "preview",
        component: "preview",
        title: "Preview",
        position: { referencePanel: "template", direction: "right" },
        initialWidth: container.clientWidth * 0.65,
    })
    layout.addPanel({
        id: "data",
        component: "data",
        title: "Data",
        position: { referencePanel: "template", direction: "below" },
        initialHeight: container.clientHeight * 0.25,
    })
}

function restoreLayout(layout) {
    try {
        layout.fromJSON(JSON.parse(localStorage.getItem("layout")))
        if (Object.keys(panels).every(id => layout.getPanel(id))) {
            return
        }
    } catch (e) {
        // No saved layout, or one that no longer matches the panels
    }
    applyDefaultLayout(layout)
}

function createLayout() {
    const { createDockview, themeDark } = window["dockview-core"]
    var layout = createDockview(document.getElementById("layout"), {
        // Dark theme, restyled in css/editor.css, with space between panels
        theme: { ...themeDark, gap: 8 },
        disableFloatingGroups: true,
        createComponent: options => ({ element: panels[options.name], init: () => {} }),
    })
    var saveLayout = () => {
        try {
            localStorage.setItem("layout", JSON.stringify(layout.toJSON()))
        } catch (e) {
            // Storage unavailable, the layout just won't be remembered
        }
    }
    restoreLayout(layout)
    saveLayout()
    layout.onDidLayoutChange(saveLayout)
    document.getElementById("reset-layout").addEventListener("click", () => applyDefaultLayout(layout))

    // Ace only resizes with the window, so follow the panel sizes instead
    var observer = new ResizeObserver(entries => entries.forEach(entry => {
        if (entry.target.env && entry.target.env.editor) {
            entry.target.env.editor.resize()
        }
    }))
    observer.observe(document.getElementById("input-editor"))
    observer.observe(document.getElementById("data-editor"))
}

createLayout()
loadThemeButtons()
document.getElementById("theme-buttons").addEventListener("click", event => {
    var button = event.target.closest("[data-theme]")
    if (button) {
        loadFromGithub(button.dataset.theme)
    }
})
document.getElementById("format-data").addEventListener("click", formatDataEditor)
document.getElementById("reset-data").addEventListener("click", resetDataEditor)
document.getElementById("fullscreen-preview").addEventListener("click", fullscreenPreview)
