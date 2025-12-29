let io = null;
function setSocket(app) {
  io = app.io;
}
function emitToDashboard(event, data) {
  if (io) {
    io.emit(event, data);
  }
}
export {
  emitToDashboard,
  setSocket
};
