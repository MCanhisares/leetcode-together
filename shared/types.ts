export interface Room {
  users: Set<string>;
  code: string;
  password: string;
}

export interface ServerToClientEvents {
  joinError: (data: { message: string }) => void;
  joinSuccess: () => void;
  initialCode: (code: string) => void;
  codeUpdate: (data: { code: string; username: string }) => void;
  userJoined: (data: { username: string; users: string[] }) => void;
  userLeft: (data: { username: string; users: string[] }) => void;
}

export interface ClientToServerEvents {
  join: (data: { 
    room: string; 
    username: string; 
    initialCode?: string;
    password: string;
  }) => void;
  codeChange: (data: { room: string; code: string; username: string }) => void;
  leaveRoom: (data: { room: string; username: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  username?: string;
  room?: string;
}