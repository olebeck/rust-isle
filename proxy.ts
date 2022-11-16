import { serve } from "https://deno.land/std@0.155.0/http/server.ts";

const host_regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)+([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$/

serve(async (req: Request) => {
    const url = new URL(req.url)
    const hostname = url.searchParams.get("hostname");
    const _port = url.searchParams.get("port");

    if(!hostname || !_port) 
    return new Response("missing parameters.", {status: 400});
    const port = parseInt(_port);
    if(!host_regex.test(hostname) || !port || port < 0 || port > 0xffff) {
        return new Response("invalid params.", {status: 400});
    }

    const upgrade = req.headers.get("upgrade") || "";
    if (upgrade.toLowerCase() != "websocket") {
        return new Response("this is a websocket api.", {status: 400});
    }

    const connection = await Deno.connect({ hostname, port }).catch(e => {
        console.error(e);
    });
    if(!connection) {
        return new Response("error connecting.", {status: 500});
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.onmessage = async (m: MessageEvent) => {
        if(m.data instanceof ArrayBuffer) {
            const data = new Uint8Array(m.data);
            if(data[data.length-1] !== 0) return;
            await connection.write(data).catch(tcp_err);
        }
    }
    socket.onclose = () => {
        connection.close();
    }
    const tcp_err = (reason: any) => {
        console.error("tcp error", reason);
        socket.close();
        connection.close();
    }

    const connection_buf = new Uint8Array(4096);
    let buffered: Array<Array<number>> = [];
    (async () => {
        while(true) {
            const n = await connection.read(connection_buf).catch(tcp_err);
            if(!n) break;
            let data = connection_buf.slice(0, n);
            while(data.length) {
                const pos_0 = data.findIndex((e) => e === 0);
                if(pos_0 !== -1) {
                    buffered.push(Array.from(data.slice(0, pos_0+1)));
                    socket.send(Uint8Array.from(buffered.flat()));
                    data = data.slice(pos_0+1);
                    buffered = [];
                } else {
                    buffered.push(Array.from(data));
                    break;
                }
            }
        }
    })();

    return response;
});
