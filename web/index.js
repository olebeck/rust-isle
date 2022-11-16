const secure = location.protocol == "https:";
const ws_scheme = secure ? "wss" : "ws";

const PROXY_HOST = "xmlsocket-ws.deno.dev";
const default_params = {
    "SERVER": "game.islehorse.com",
    "PORT": "12321"
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

    function err(msg) {
        console.error(msg);
        err_elem.innerText = String(msg);
    }

    player.onXmlSocketConnect = async (host, port, handle) => {
        // handle weird bug
        if(host != params.SERVER || port != params.PORT) {
            host = params.SERVER, port = params.PORT;
        }
        
        return new Promise((resolve, reject) => {
            let url = `${ws_scheme}://${host}:${port}`;
            if(params.PROXY) {
                url = `${ws_scheme}://${PROXY_HOST}/?hostname=${host}&port=${port}`
            }

            let ws;
            try {
                ws = new WebSocket(url);
            } catch (error) {
                err(error);
                reject(error);
            }
            if(!ws) return;

            err_elem.innerText = `Connecting to ${url}`;

            ws.onopen = () => {
                err_elem.innerText = "";
                resolve({
                    send: (data) => {
                        const buf = new Uint8Array(data.length+1);
                        buf.set(data);
                        ws.send(buf);
                    },
                    close: () => { ws.close(); },
                });
            }
            ws.onerror = (e) => { err(`websocket error`); reject(e); }
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