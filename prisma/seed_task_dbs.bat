@echo off
set DB_DIR=prisma\task_dbs
if not exist %DB_DIR% mkdir %DB_DIR%

echo Creating easy.db...
(
echo CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, email TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP^);
echo CREATE TABLE Posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT NOT NULL, content TEXT, published_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id^) REFERENCES Users(id^)^);
echo CREATE TABLE Comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER, user_id INTEGER, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (post_id^) REFERENCES Posts(id^), FOREIGN KEY (user_id^) REFERENCES Users(id^)^);
echo INSERT INTO Users (username, email^) VALUES ('kovacs_janos', 'janos@example.com'^), ('szabo_mari', 'mari@example.com'^), ('nagy_peter', 'peter@example.com'^);
echo INSERT INTO Posts (user_id, title, content^) VALUES (1, 'Első bejegyzés', 'Ez egy rövid bejegyzés.'^), (1, 'Második bejegyzés', 'Itt már több szöveg van.'^), (2, 'SQL Alapok', 'Ma SQL-t tanulunk.'^);
echo INSERT INTO Comments (post_id, user_id, content^) VALUES (1, 3, 'Nagyon hasznos!'^), (3, 1, 'Köszi a cikket!'^);
) | "%~dp0..\sqlite3.exe" %DB_DIR%\easy.db

echo Creating medium.db...
(
echo CREATE TABLE Customers (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL, city TEXT^);
echo CREATE TABLE Products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL, stock_quantity INTEGER DEFAULT 0^);
echo CREATE TABLE Orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, order_date DATETIME DEFAULT CURRENT_TIMESTAMP, status TEXT, FOREIGN KEY (customer_id^) REFERENCES Customers(id^)^);
echo CREATE TABLE Order_Items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER, quantity INTEGER, unit_price REAL, FOREIGN KEY (order_id^) REFERENCES Orders(id^), FOREIGN KEY (product_id^) REFERENCES Products(id^)^);
echo CREATE TABLE Categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL^);
echo CREATE TABLE Product_Categories (product_id INTEGER, category_id INTEGER, PRIMARY KEY (product_id, category_id^), FOREIGN KEY (product_id^) REFERENCES Products(id^), FOREIGN KEY (category_id^) REFERENCES Categories(id^)^);
echo INSERT INTO Customers (first_name, last_name, email, city^) VALUES ('Béla', 'Kovács', 'bela@gmail.com', 'Budapest'^), ('Anna', 'Nagy', 'anna@gmail.com', 'Debrecen'^), ('Gábor', 'Tóth', 'gabor@gmail.com', 'Szeged'^);
echo INSERT INTO Products (name, price, stock_quantity^) VALUES ('Laptop', 250000, 10^), ('Egér', 5000, 50^), ('Billentyűzet', 12000, 30^), ('Monitor', 60000, 15^);
echo INSERT INTO Categories (name^) VALUES ('Elektronika'^), ('Perifériák'^);
echo INSERT INTO Product_Categories (product_id, category_id^) VALUES (1, 1^), (2, 2^), (3, 2^), (4, 1^);
echo INSERT INTO Orders (customer_id, status^) VALUES (1, 'Teljesítve'^), (2, 'Függőben'^);
echo INSERT INTO Order_Items (order_id, product_id, quantity, unit_price^) VALUES (1, 1, 1, 250000^), (1, 2, 2, 5000^), (2, 4, 1, 60000^);
) | "%~dp0..\sqlite3.exe" %DB_DIR%\medium.db

echo Creating hard.db...
(
echo CREATE TABLE Departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, building TEXT^);
echo CREATE TABLE Professors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, department_id INTEGER, FOREIGN KEY (department_id^) REFERENCES Departments(id^)^);
echo CREATE TABLE Courses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, credits INTEGER, department_id INTEGER, FOREIGN KEY (department_id^) REFERENCES Departments(id^)^);
echo CREATE TABLE Students (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, major TEXT, enroll_year INTEGER^);
echo CREATE TABLE Sections (id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER, professor_id INTEGER, semester TEXT, year INTEGER, FOREIGN KEY (course_id^) REFERENCES Courses(id^), FOREIGN KEY (professor_id^) REFERENCES Professors(id^)^);
echo CREATE TABLE Enrollments (student_id INTEGER, section_id INTEGER, grade TEXT, PRIMARY KEY (student_id, section_id^), FOREIGN KEY (student_id^) REFERENCES Students(id^), FOREIGN KEY (section_id^) REFERENCES Sections(id^)^);
echo INSERT INTO Departments (name, building^) VALUES ('Informatika', 'A épület'^), ('Matematika', 'B épület'^);
echo INSERT INTO Professors (name, department_id^) VALUES ('Dr. Szabó Gábor', 1^), ('Dr. Kiss Anna', 2^);
echo INSERT INTO Courses (title, credits, department_id^) VALUES ('Adatbázisok', 5, 1^), ('Analízis', 6, 2^), ('Programozás', 4, 1^);
echo INSERT INTO Students (name, major, enroll_year^) VALUES ('Kovács Péter', 'Info', 2023^), ('Nagy Zsófia', 'Matek', 2022^);
echo INSERT INTO Sections (course_id, professor_id, semester, year^) VALUES (1, 1, 'Ősz', 2024^), (2, 2, 'Ősz', 2024^), (3, 1, 'Ősz', 2024^);
echo INSERT INTO Enrollments (student_id, section_id, grade^) VALUES (1, 1, '5'^), (1, 3, '4'^), (2, 2, '5'^);
) | "%~dp0..\sqlite3.exe" %DB_DIR%\hard.db

echo Done!
