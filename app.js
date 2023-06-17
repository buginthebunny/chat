const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const users = [];
const CHATS_FILE_PATH = './chats.json';
const DELETION_INTERVAL = 8 * 60 * 60 * 1000; // 8 hours

const app = express();
const server = app.listen(3000, () => {
  console.log("App is running on port 3000");
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  // Generate a random username for the new user
  const userName = generateRandomUsername();

  // Send initial messages and username when a client connects
  ws.send(JSON.stringify(users));
  ws.send(JSON.stringify({ userName }));

  // Listen for new messages from clients
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const inputUserMessage = data.userMessage;

    users.push({
      id: uuidv4(),
      userName,
      userMessage: inputUserMessage
    });

    // Broadcast the updated messages to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(users));
      }
    });

    // Save the updated messages to JSON file
    saveChatsToFile();
  });
});

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Load chats from JSON file
loadChatsFromFile();

app.get("/", function(req, res) {
  res.render("home", { data: users });
});

app.post("/", (req, res) => {
  const inputUserMessage = req.body.userMessage;

  users.push({
    id: uuidv4(),
    userName: "anon-miss",
    userMessage: inputUserMessage,
  });

  // Broadcast the updated messages to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(users));
    }
  });

  // Save the updated messages to JSON file
  saveChatsToFile();

  res.redirect("/");
});

// AJAX endpoint to fetch updated messages
app.get("/messages", function(req, res) {
  res.json(users);
});

// Delete all data except where userName is "admin" from the chat file every 8 hours
setInterval(() => {
  const filteredUsers = users.filter(user => user.userName === "admin");
  users.length = 0;
  users.push(...filteredUsers);
  saveChatsToFile();
}, DELETION_INTERVAL);

function generateRandomUsername() {
  const adjectives = ["Happy", "Silly", "Funny", "Clever", "Kind", "Brave", "Smart", "Gentle", "Witty"];
  const nouns = ["Cat", "Dog", "Tiger", "Lion", "Elephant", "Monkey", "Panda", "Kangaroo", "Giraffe"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}${noun}`;
}

function loadChatsFromFile() {
  try {
    const chatsData = fs.readFileSync(CHATS_FILE_PATH, 'utf8');
    users.push(...JSON.parse(chatsData));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('Chats JSON file not found. Creating new file...');
      saveChatsToFile();
    } else {
      console.log('Error reading chats JSON file:', err);
    }
  }
}

function saveChatsToFile() {
  fs.writeFile(CHATS_FILE_PATH, JSON.stringify(users), (err) => {
    if (err) {
      console.log('Error writing chats JSON file:', err);
    }
  });
}
