type User = {
  id: string;
  key: string;
  expiration: Date;
};

type ServerStatus = {
  running: boolean;
  bindPort: string;
  fileServerPort: string;
  token: string;
};

export { User, ServerStatus };
