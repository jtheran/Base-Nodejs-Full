
import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
    io = new Server(server);
    if(!io){
       
        throw new Error('❌ Socket.IO no iniciado');
    }

    io.on('connection', (socket) => {
       
        socket.on('disconnect', () => {
           
        });
    });

    return io;
};

export const getIO = () => {
    if(!io){
        throw new Error('❌ Socket.IO no ha sido inicializado');
    }else{
        return io;
    }
    
};
