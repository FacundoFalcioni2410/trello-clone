import Pusher from "pusher-js";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const REVERB_KEY = process.env.NEXT_PUBLIC_REVERB_APP_KEY || "q9ogukmhscudlruhfa9x";
const REVERB_HOST = process.env.NEXT_PUBLIC_REVERB_HOST || "localhost";
const REVERB_PORT = parseInt(process.env.NEXT_PUBLIC_REVERB_PORT || "8080", 10);
const REVERB_SCHEME = process.env.NEXT_PUBLIC_REVERB_SCHEME || "http";
const USE_TLS = REVERB_SCHEME === "https";

function getCsrfToken(): string | null {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

let pusherInstance: Pusher | null = null;

function getPusher(): Pusher | null {
  if (typeof window === "undefined") return null;
  if (pusherInstance) return pusherInstance;

  const token = getCsrfToken();

  const options: Record<string, unknown> = {
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    forceTLS: USE_TLS,
    enabledTransports: USE_TLS ? ["wss"] : ["ws"],
    disableStats: true,
    cluster: "",
    authEndpoint: `${API_BASE}/broadcasting/auth`,
    auth: {
      headers: {
        Accept: "application/json",
        "X-XSRF-TOKEN": token ?? "",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
    authTransport: "ajax",
    beforeSend: (xhr: XMLHttpRequest) => {
      xhr.withCredentials = true;
    },
  };

  if (USE_TLS) {
    options.wssPort = REVERB_PORT;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pusher = new Pusher(REVERB_KEY, options as any);

  pusher.connection.bind("error", (err: unknown) => {
    // Silently ignore connection errors unless explicitly debugging
    if (process.env.NODE_ENV === "development") {
      console.debug("[Pusher] Connection error:", err);
    }
  });

  pusher.connection.bind("connected", () => {
    console.log("[Pusher] Connected, socket_id:", pusher.connection.socket_id);
  });

  pusherInstance = pusher;
  return pusher;
}

export function listenToBoard(boardId: number, callback: () => void) {
  const pusher = getPusher();
  if (!pusher) return () => {};

  const channelName = `boards.${boardId}`;
  const channel = pusher.subscribe(channelName);
  const eventName = "board.updated";

  channel.bind("pusher:subscription_succeeded", () => {
    console.log(`[Pusher] Subscribed to ${channelName}`);
  });

  channel.bind("pusher:subscription_error", (status: unknown) => {
    console.warn(`[Pusher] Subscription error for ${channelName}:`, status);
  });

  channel.bind(eventName, (data: unknown) => {
    console.log(`[Pusher] Event ${eventName} received:`, data);
    callback();
  });

  return () => {
    channel.unbind(eventName, callback);
    pusher.unsubscribe(channelName);
  };
}

export function listenToUser(userId: number, callback: () => void) {
  const pusher = getPusher();
  if (!pusher) return () => {};

  const channelName = `users.${userId}`;
  const channel = pusher.subscribe(channelName);
  const eventName = "user.boards.updated";

  channel.bind("pusher:subscription_succeeded", () => {
    console.log(`[Pusher] Subscribed to ${channelName}`);
  });

  channel.bind("pusher:subscription_error", (status: unknown) => {
    console.warn(`[Pusher] Subscription error for ${channelName}:`, status);
  });

  channel.bind(eventName, (data: unknown) => {
    console.log(`[Pusher] Event ${eventName} received:`, data);
    callback();
  });

  return () => {
    channel.unbind(eventName, callback);
    pusher.unsubscribe(channelName);
  };
}
