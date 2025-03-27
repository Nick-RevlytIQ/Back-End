const express = require('express');
const axios = require('axios');
const router = express.Router();

const SLACK_BOT_TOKEN = process.env.SLACK_USER_TOKEN; // Store in .env file

// Fetch Slack Members
router.get('/members', async (req, res) => {
  try {
    const response = await axios.get('https://slack.com/api/users.list', {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (response.data.ok) {
      const members = response.data.members.map(user => ({
        id: user.id,
        name: user.real_name || user.name,
        image: user.profile.image_48,
      }));
      res.json(members);
    } else {
      res.status(400).json({ error: response.data.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Slack members' });
  }
});

router.get('/user/profile', async (req, res) => {
  try {
    // Step 1: Get the logged-in user's ID
    const authResponse = await axios.get("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    });

    if (!authResponse.data.ok) {
      return res.status(400).json({ error: authResponse.data.error });
    }

    const userId = authResponse.data.user_id; // Logged-in user's ID

    // Step 2: Fetch user details using users.info
    const userResponse = await axios.get(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    });

    if (!userResponse.data.ok) {
      return res.status(400).json({ error: userResponse.data.error });
    }

    const user = userResponse.data.user;
    res.json({
      id: user.id,
      name: user.real_name || user.name,
      username: user.name,
      image: user.profile.image_192 || user.profile.image_48,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});


// Fetch Slack Activity (Recent Messages from a Channel)
router.get("/activity", async (req, res) => {
  try {
    const channelsResponse = await axios.get("https://slack.com/api/conversations.list", {
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    });

    if (!channelsResponse.data.ok) {
      console.error("Error fetching channels:", channelsResponse.data.error);
      return res.status(400).json({ error: channelsResponse.data.error });
    }

    const channels = channelsResponse.data.channels;
    let allActivity = [];

    for (const channel of channels) {
      const messagesResponse = await axios.get(
        `https://slack.com/api/conversations.history?channel=${channel.id}`,
        { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } }
      );

      if (!messagesResponse.data.ok) {
        console.error(`Error fetching messages for ${channel.name}:`, messagesResponse.data.error);
        continue; // Skip this channel and move to the next
      }

      const channelActivity = messagesResponse.data.messages.map(msg => {
        const dateObj = new Date(msg.ts * 1000);
        return {
            channel: channel.name,
            text: msg.text,
            user: msg.user,
            time: dateObj.toLocaleString("en-US", { 
                year: "numeric", 
                month: "short", 
                day: "numeric", 
                hour: "2-digit", 
                minute: "2-digit", 
                second: "2-digit", 
                hour12: true 
            }),
        };
    });
    
      allActivity = [...allActivity, ...channelActivity];
    }

    res.json(allActivity);
  } catch (error) {
    console.error("Error fetching Slack activity:", error);
    res.status(500).json({ error: "Failed to fetch Slack activity" });
  }
});


router.get("/channels", async (req, res) => {
  try {
    const response = await axios.get("https://slack.com/api/conversations.list", {
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    });

    if (response.data.ok) {
      const channels = response.data.channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        is_private: channel.is_private,
      }));
      return res.json(channels);
    }
    res.status(400).json({ error: response.data.error });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Slack channels" });
  }
});
// Fetch Slack Chat History (for a Channel or a Direct Message)
router.get("/chat", async (req, res) => {
  try {
    const { id, type } = req.query;

    if (!id || !type) {
      return res.status(400).json({ error: "Channel or User ID is required" });
    }

    let channelId;

    if (type === "channel") {
      channelId = id; // Use the provided channel ID
    } else if (type === "user") {
      // Step 1: Get the DM (Direct Message) conversation ID
      const dmResponse = await axios.get("https://slack.com/api/users.conversations", {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
        params: {
          user: id,
          types: "im",
        },
      });

      if (!dmResponse.data.ok) {
        return res.status(400).json({ error: dmResponse.data.error });
      }

      const dmChannel = dmResponse.data.channels.find(channel => channel.user === id);
      if (!dmChannel) {
        return res.status(400).json({ error: "No direct message conversation found with this user." });
      }

      channelId = dmChannel.id;
    } else {
      return res.status(400).json({ error: "Invalid type. Must be 'channel' or 'user'." });
    }

    // Step 2: Fetch Chat History
    let allMessages = [];
    let nextCursor = null;

    do {
      const messagesResponse = await axios.get("https://slack.com/api/conversations.history", {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
        params: { channel: channelId, cursor: nextCursor },
      });

      if (!messagesResponse.data.ok) {
        return res.status(400).json({ error: messagesResponse.data.error });
      }

      // Format messages with full date and time
      const formattedMessages = messagesResponse.data.messages.map(msg => ({
        user: msg.user,
        text: msg.text,
        datetime: new Date(msg.ts * 1000).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      }));

      allMessages = [...allMessages, ...formattedMessages];

      nextCursor = messagesResponse.data.response_metadata?.next_cursor || null;
    } while (nextCursor); // Continue fetching if more data exists

    res.json(allMessages);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});





module.exports = router;
