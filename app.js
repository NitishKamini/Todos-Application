const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
const isMatch = require("date-fns/isMatch");
var isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

let dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running on http://localhost:3000");
    });
  } catch (error) {
    console.log(`DB Error message: '${error.message}'`);
  }
};

initializeDBAndServer();

const possibleValuesForStatus = ["TO DO", "IN PROGRESS", "DONE"];
const possibleValuesForPriority = ["HIGH", "MEDIUM", "LOW"];
const possibleValuesForCategory = ["WORK", "HOME", "LEARNING"];

// API - ONE

const convertDbObject = (eachObject) => {
  return {
    id: eachObject.id,
    todo: eachObject.todo,
    priority: eachObject.priority,
    status: eachObject.status,
    category: eachObject.category,
    dueDate: eachObject.due_date,
  };
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasBothPirorityAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.status !== undefined && requestQuery.priorty !== undefined
  );
};

const hasSearchTextProperty = (requestQuery) => {
  return requestQuery.search_q !== undefined;
};

const hasBothCategoryAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasBothCategoryAndPriorityProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priorty !== undefined
  );
};

app.get("/todos/", async (request, response) => {
  const requestQueryObject = request.query;
  const { status, priority, category, search_q = "" } = requestQueryObject;
  let data = null;
  let getTodosQuery = "";

  switch (true) {
    case hasStatusProperty(requestQueryObject):
      if (possibleValuesForStatus.includes(requestQueryObject.status)) {
        getTodosQuery = `select * from todo WHERE status = '${requestQueryObject.status}';`;
        data = await db.all(getTodosQuery);
        response.send(data.map((eachTodo) => convertDbObject(eachTodo)));
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    case hasPriorityProperty(requestQueryObject):
      if (possibleValuesForPriority.includes(requestQueryObject.priority)) {
        getTodosQuery = `select * from todo where priority = '${requestQueryObject.priority}';`;
        data = await db.all(getTodosQuery);
        response.send(data.map((eachTodo) => convertDbObject(eachTodo)));
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case hasBothPirorityAndStatusProperty(requestQueryObject):
      if (possibleValuesForPriority.includes(requestQueryObject.priority)) {
        if (possibleValuesForStatus.includes(requestQueryObject.status)) {
          getTodosQuery = `select * from todo where priorty = '${requestQueryObject.priority}' and status = '${requestQueryObject.status}';`;
          data = await db.all(getTodosQuery);
          response.send(data.map((eachTodo) => convertDbObject(eachTodo)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case hasSearchTextProperty(requestQueryObject):
      let search_q = requestQueryObject.search_q;
      getTodosQuery = `select * from todo where todo LIKE '%${search_q}%';`;
      data = await db.all(getTodosQuery);
      response.send(data.map((eachTodo) => convertDbObject(eachTodo)));
      break;

    case hasBothCategoryAndStatusProperty(requestQueryObject):
      if (possibleValuesForCategory.includes(requestQueryObject.category)) {
        if (possibleValuesForStatus.includes(requestQueryObject.status)) {
          getTodosQuery = `select * from todo where category = '${requestQueryObject.category}' and status = '${requestQueryObject.status}';`;
          data = await db.all(getTodosQuery);
          response.send(data.map((eachTodo) => convertDbObject(eachTodo)));
        } else {
          response.status(400);
          response.send("Invalid Todo status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    case hasCategoryProperty(requestQueryObject):
      if (possibleValuesForCategory.includes(requestQueryObject.category)) {
        getTodosQuery = `select * from todo where category = '${requestQueryObject.category}';`;
        data = await db.all(getTodosQuery);
        response.send(data.map((eachTodo) => convertDbObject(eachTodo)));
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    default:
      if (possibleValuesForCategory.includes(requestQueryObject.category)) {
        if (possibleValuesForPriority.includes(requestQueryObject.priority)) {
          getTodosQuery = `select * from todo where category = '${requestQueryObject.category}' and priority = ${requestQueryObject.priority};`;
          data = await db.all(getTodosQuery);
          response.send(data.map((eachTodo) => convertDbObject(eachTodo)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
  }
});

// API - TWO

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `select * from todo where id =${todoId};`;
  const data = await db.get(getTodoQuery);
  response.send(convertDbObject(data));
});

// API - THREE

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  console.log(isMatch(date, "yyyy-MM-dd"));
  if (isMatch(date, "yyyy-MM-dd")) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    console.log(newDate);
    const requestQuery = `select * from todo where due_date='${newDate}';`;
    const responseResult = await db.all(requestQuery);
    //console.log(responseResult);
    response.send(responseResult);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// API - FOUR

app.post("/todos/", async (request, response) => {
  const { id, todo, status, priority, category, dueDate } = request.body;
  if (possibleValuesForStatus.includes(status)) {
    if (possibleValuesForPriority.includes(priority)) {
      if (possibleValuesForCategory.includes(category)) {
        if (isValid(dueDate)) {
          let postDueDate = format(new Date(dueDate, "yyyy-MM-dd"));
          const createTodoQuery = `insert into todo(id, todo, status, priority, category, due_date)
                                            values(${id}, '${todo}', '${status}', '${priority}', '${category}', '${postDueDate}');`;
          const dbResponse = await db.run(createTodoQuery);
          response.send("Todo Successfully Added");
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Status");
  }
});

// API - FIVE

const updateStatusProperty = (todoObject) => {
  return todoObject.status !== undefined;
};

const updatePriorityProperty = (todoObject) => {
  return todoObject.priority !== undefined;
};

const updateTodoProperty = (todoObject) => {
  return todoObject.todo !== undefined;
};

const updateCategoryProperty = (todoObject) => {
  return todoObject.category !== undefined;
};

const updateDueDateProperty = (todoObject) => {
  return todoObject.todo !== undefined;
};

app.put("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const updateDetails = request.body;
  let updateTodoQuery = "";
  let dbResponse = null;

  switch (true) {
    case updateStatusProperty(updateDetails):
      if (possibleValuesForStatus.includes(updateDetails.status)) {
        updateTodoQuery = `update todo set status = '${updateDetails.status}' where id = ${todoId};`;
        dbResponse = await db.run(updateTodoQuery);
        response.send("Status Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;

    case updatePriorityProperty(updateDetails):
      if (possibleValuesForPriority.includes(updateDetails.priority)) {
        updateTodoQuery = `update todo set priority = '${updateDetails.priority}' where id = ${todoId};`;
        dbResponse = await db.run(updateTodoQuery);
        response.send("Priority Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;

    case updateTodoProperty(updateDetails):
      updateTodoQuery = `update todo set todo = '${updateDetails.todo}' where id = ${todoId};`;
      dbResponse = await db.run(updateTodoQuery);
      response.send("Todo Updated");
      break;

    case updateCategoryProperty(updateDetails):
      if (possibleValuesForCategory.includes(updateDetails.category)) {
        updateTodoQuery = `update todo set category = '${updateDetails.category}' where id = ${todoId};`;
        dbResponse = await db.run(updateTodoQuery);
        response.send("Category Updated");
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    default:
      const { dueDate } = updateDetails;
      const isValidDate = isValid(dueDate);
      if (isValidDate) {
        let updateDate = format(new Date(dueDate), "yyyy-MM-dd");
        updateDate = updateDate.split("T")[0];
        updateTodoQuery = `update todo set due_date = '${updateDate}' where id = ${todoId};`;
        dbResponse = await db.run(updateTodoQuery);
        response.send("Due Date Updated");
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
  }
});

// API - SIX

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `delete from todo where id = ${todoId};`;
  const dbResponse = await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
