const {
	MatrixClient,
	SimpleFsStorageProvider,
	AutojoinRoomsMixin,
	RichReply
} = require("matrix-bot-sdk");

const fetch = require("node-fetch");
const url = "https://www.shipton-mill.com/queue";

// see https://t2bot.io/docs/access_tokens
const { accessToken } = require("./secrets/accessToken.json");

// where you would point a client to talk to a homeserver
const homeserverUrl = "https://matrix.org";

// We'll want to make sure the bot doesn't have to do an initial sync every
// time it restarts, so we need to prepare a storage provider. Here we use
// a simple JSON database.
const storage = new SimpleFsStorageProvider("bread-bot.json");

// Now we can create the client and set it up to automatically join rooms.
const client = new MatrixClient(homeserverUrl, accessToken, storage);
AutojoinRoomsMixin.setupOnClient(client);

// We also want to make sure we can receive events - this is where we will
// handle our command.
client.on("room.message", ping);

// Now that the client is all set up and the event handler is registered, start the
// client up. This will start it syncing.
client.start().then(() => console.log("Client started!"));

const breadQ = text =>
	text.includes("we don't have any delivery slots available at this time");

client.getJoinedRooms().then(rooms => {
	let post = true;
	setInterval(() => {
		fetch(url)
			.then(res => res.text())
			.then(text => {
				if (!breadQ(text) && post)
					rooms.forEach(roomId => {
						client.sendMessage(roomId, {
							msgtype: "m.notice",
							body: `${new Date().toGMTString()}
							Check for flour at ${url}`
						});
					});
				post = false;
				if (breadQ(text)) post = true;
			})
			.catch(console.log);
	}, 45000);
});

// This is our event handler for dealing with the `!hello` command.
async function ping(roomId, event) {
	// Don't handle events that don't have contents (they were probably redacted)
	if (!event["content"]) return;

	// Don't handle non-text events
	if (event["content"]["msgtype"] !== "m.text") return;

	// We never send `m.text` messages so this isn't required, however this is
	// how you would filter out events sent by the bot itself.
	if (event["sender"] === (await client.getUserId())) return;

	// Make sure that the event looks like a command we're expecting
	const body = event["content"]["body"];
	if (!body || !body.startsWith("Ping")) return;

	// If we've reached this point, we can safely execute the command. We'll
	// send a reply to the user's command saying "Hello World!".
	// const replyBody = "Hello I'm still here!"; // we don't have any special styling to do.
	// const reply = RichReply.createFor(roomId, event, replyBody, replyBody);
	client.sendMessage(roomId, {
		msgtype: "m.notice",
		body: new Date().toGMTString()
	});
}
