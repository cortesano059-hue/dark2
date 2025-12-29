import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_API_URL || undefined;
export const socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: false
});
