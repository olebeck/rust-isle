const secure = location.protocol.endsWith("s");
const ws_scheme = secure ? "wss" : "ws";

const default_params = {
    "SERVER": "game.islehorse.com",
    "PORT": "12321",
    "USER": ""
}
const hisp_swf = "horseisle.swf";

const err_elem = document.querySelector("#error");

const url_params = Object.fromEntries(new URLSearchParams(location.hash.slice(1)).entries());
const params = Object.assign(Object.assign({}, default_params), url_params);

const RufflePlayer = window.RufflePlayer || {};
const ruffle = window.RufflePlayer.newest();

async function load() {
    const player = ruffle.createPlayer();
    player.id = "player";
    player.style.width = "790px";
    player.style.height = "500px";
    document.querySelector("#flash").append(player);

    player.onXmlSocketConnect = async (host, port, handle) => {
        // handle weird bug
        if(host != params.SERVER || port != params.PORT) {
            host = params.SERVER, port = params.PORT;
        }
        
        return new Promise((resolve, reject) => {
            let ws;
            try {
                const url = `${ws_scheme}://${host}:${port}`;
                ws = new WebSocket(url);
            } catch (error) {
                console.error(error);
                err_elem.innerText = error;
                reject(error);
            }

            ws.onopen = () => {
                resolve({
                    send: (data) => {
                        const buf = new Uint8Array(data.length+1);
                        buf.set(data);
                        ws.send(buf);
                    },
                    close: () => { ws.close(); },
                });
            }
            ws.onerror = (e) => { reject(e); }
            ws.onmessage = async (message) => {
                const buf = new Uint8Array(await message.data.arrayBuffer());
                handle.receive(buf.slice(0, buf.length-1));
            }
            ws.onclose = () => { handle.close(); }
        });
    }

    player.addEventListener("loadedmetadata", () => {
        document.body.style.backgroundColor = player.metadata.backgroundColor;
    }, { once: true });

    
    player.load({
        url: hisp_swf,
        logLevel: "debug",
        autoplay: true,
        allowScriptAccess: true,
        parameters: params,
    });
}

load();


window.onhashchange = () => {
    location.reload();
}