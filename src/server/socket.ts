import type { FastifyInstance } from "fastify";

let io: any = null;

export function setSocket(app: FastifyInstance) {
    // @ts-ignore
    io = app.io;
}

export function emitToDashboard(event: string, data: any) {
    if (io) {
        io.emit(event, data);
    }
}
