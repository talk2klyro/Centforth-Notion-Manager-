const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Environment variables (set on Vercel or locally in .env)
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

if(!NOTION_TOKEN || !DATABASE_ID) {
  console.error("Error: NOTION_TOKEN or NOTION_DATABASE_ID is not set!");
  process.exit(1);
}

// Push new tasks to Notion
app.post('/push-tasks', async (req, res) => {
  const tasks = req.body.tasks;

  try {
    const results = [];
    for (let task of tasks) {
      const response = await axios.post(
        `https://api.notion.com/v1/pages`,
        {
          parent: { database_id: DATABASE_ID },
          properties: {
            "Task Name": { title: [{ text: { content: task.taskName } }] },
            "Assigned AI": { select: { name: task.assignedAI } },
            "Folder": { rich_text: [{ text: { content: task.folder } }] },
            "Status": { select: { name: task.status } },
            "Priority": { select: { name: task.priority } }
          }
        },
        {
          headers: {
            "Authorization": `Bearer ${NOTION_TOKEN}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
          }
        }
      );
      results.push(response.data);
    }
    res.json({ success: true, results });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch existing tasks from Notion
app.get('/get-tasks', async (req, res) => {
  try {
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
      {},
      {
        headers: {
          "Authorization": `Bearer ${NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json"
        }
      }
    );

    const tasks = response.data.results.map(page => ({
      id: page.id,
      taskName: page.properties["Task Name"]?.title[0]?.text?.content || "",
      assignedAI: page.properties["Assigned AI"]?.select?.name || "",
      folder: page.properties["Folder"]?.rich_text[0]?.text?.content || "",
      status: page.properties["Status"]?.select?.name || "",
      priority: page.properties["Priority"]?.select?.name || ""
    }));

    res.json({ success: true, tasks });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update existing task in Notion
app.patch('/update-task', async (req, res) => {
  const { id, task } = req.body;
  try {
    const response = await axios.patch(
      `https://api.notion.com/v1/pages/${id}`,
      { properties: {
          "Task Name": { title: [{ text: { content: task.taskName } }] },
          "Assigned AI": { select: { name: task.assignedAI } },
          "Folder": { rich_text: [{ text: { content: task.folder } }] },
          "Status": { select: { name: task.status } },
          "Priority": { select: { name: task.priority } }
        }
      },
      {
        headers: {
          "Authorization": `Bearer ${NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json"
        }
      }
    );
    res.json({ success: true, data: response.data });
  } catch(err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete (archive) task in Notion
app.delete('/delete-task/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.patch(
      `https://api.notion.com/v1/pages/${id}`,
      { archived: true },
      {
        headers: {
          "Authorization": `Bearer ${NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json"
        }
      }
    );
    res.json({ success: true, data: response.data });
  } catch(err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
