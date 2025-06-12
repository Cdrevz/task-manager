// ======================
// IndexedDB Setup
// ======================
let db;
const request = indexedDB.open("TaskManagerDB", 1);

request.onupgradeneeded = (event) => {
  db = event.target.result;
  db.createObjectStore("tasks", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (event) => {
  db = event.target.result;
  loadTasksFromDB();
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
  }
};

// ======================
// DOM Elements
// ======================
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");
const searchInput = document.getElementById("search-input");
const darkModeToggle = document.getElementById("dark-mode-toggle");

// ======================
// Dark Mode Toggle
// ======================
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
});

// ======================
// Search Functionality
// ======================
searchInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  document.querySelectorAll("#task-list li").forEach(task => {
    const text = task.querySelector("span").textContent.toLowerCase();
    task.style.display = text.includes(searchTerm) ? "flex" : "none";
  });
});

// ======================
// Load Tasks from IndexedDB
// ======================
function loadTasksFromDB() {
  const transaction = db.transaction("tasks", "readonly");
  const store = transaction.objectStore("tasks");
  const request = store.getAll();

  request.onsuccess = () => {
    taskList.innerHTML = "";
    request.result.forEach(task => addTaskToDOM(task));
    makeTasksDraggable();
  };
}

// ======================
// Add Task to DOM
// ======================
function addTaskToDOM(task) {
  const li = document.createElement("li");
  li.dataset.id = task.id;
  li.className = `priority-${task.priority}`;
  li.innerHTML = `
    <span>${task.text}</span>
    <small>${task.dueDate ? "Due: " + task.dueDate : ""}</small>
    <span class="tag ${task.category}">${task.category}</span>
    <button class="delete-btn">Delete</button>
  `;

  // Toggle completion
  li.querySelector("span").addEventListener("click", () => {
    li.classList.toggle("completed");
    task.completed = !task.completed;
    updateTaskInDB(task);
  });

  // Delete task
  li.querySelector(".delete-btn").addEventListener("click", () => {
    li.remove();
    deleteTaskFromDB(task.id);
  });

  if (task.completed) li.classList.add("completed");
  taskList.appendChild(li);
}

// ======================
// IndexedDB CRUD Operations
// ======================
function saveTaskToDB(task) {
  const transaction = db.transaction("tasks", "readwrite");
  const store = transaction.objectStore("tasks");
  store.add(task);
}

function deleteTaskFromDB(id) {
  const transaction = db.transaction("tasks", "readwrite");
  const store = transaction.objectStore("tasks");
  store.delete(id);
}

function updateTaskInDB(task) {
  const transaction = db.transaction("tasks", "readwrite");
  const store = transaction.objectStore("tasks");
  store.put(task);
}

// ======================
// Drag-and-Drop Implementation
// ======================
function makeTasksDraggable() {
  const tasks = document.querySelectorAll("#task-list li");
  tasks.forEach(task => {
    task.setAttribute("draggable", "true");
    
    task.addEventListener("dragstart", () => {
      task.classList.add("dragging");
    });
    
    task.addEventListener("dragend", () => {
      task.classList.remove("dragging");
      updateTaskOrderInDB();
    });
  });

  taskList.addEventListener("dragover", e => {
    e.preventDefault();
    const draggingTask = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(taskList, e.clientY);
    
    if (afterElement == null) {
      taskList.appendChild(draggingTask);
    } else {
      taskList.insertBefore(draggingTask, afterElement);
    }
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll("li:not(.dragging)")];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateTaskOrderInDB() {
  const transaction = db.transaction("tasks", "readwrite");
  const store = transaction.objectStore("tasks");
  store.clear().onsuccess = () => {
    document.querySelectorAll("#task-list li").forEach(li => {
      const task = {
        id: Number(li.dataset.id),
        text: li.querySelector("span").textContent,
        dueDate: li.querySelector("small")?.textContent.replace("Due: ", "") || "",
        category: li.querySelector(".tag").className.replace("tag ", ""),
        priority: li.className.replace("priority-", "").split(" ")[0],
        completed: li.classList.contains("completed")
      };
      store.add(task);
    });
  };
}

// ======================
// Form Submission
// ======================
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const taskText = taskInput.value.trim();
  const dueDate = document.getElementById("due-date").value;
  const category = document.getElementById("category").value;
  const priority = document.getElementById("priority").value;

  if (taskText) {
    const task = { 
      text: taskText, 
      dueDate, 
      category, 
      priority, 
      completed: false 
    };
    addTaskToDOM(task);
    saveTaskToDB(task);
    taskInput.value = "";
  }
});