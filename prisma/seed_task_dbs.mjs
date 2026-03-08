import _sqlite3 from 'sqlite3';
const sqlite3 = _sqlite3.verbose();
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, 'task_dbs');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);

// Remove old difficulty-based DBs
['easy.db', 'medium.db', 'hard.db'].forEach(f => {
    const p = path.join(targetDir, f);
    if (fs.existsSync(p)) { fs.unlinkSync(p); console.log(`Deleted old ${f}`); }
});

const dbs = [
    {
        name: 'sql_1.db',
        schema: `
            DROP TABLE IF EXISTS Product_Categories;
            DROP TABLE IF EXISTS Categories;
            DROP TABLE IF EXISTS Order_Items;
            DROP TABLE IF EXISTS Orders;
            DROP TABLE IF EXISTS Products;
            DROP TABLE IF EXISTS Customers;
            CREATE TABLE Customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT NOT NULL,
                city TEXT,
                discount_level INTEGER DEFAULT 0
            );
            CREATE TABLE Products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                stock_quantity INTEGER DEFAULT 0
            );
            CREATE TABLE Orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER,
                order_date DATE,
                status TEXT,
                total_amount REAL,
                FOREIGN KEY (customer_id) REFERENCES Customers(id)
            );
            CREATE TABLE Order_Items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                product_id INTEGER,
                quantity INTEGER,
                unit_price REAL,
                FOREIGN KEY (order_id) REFERENCES Orders(id),
                FOREIGN KEY (product_id) REFERENCES Products(id)
            );
            CREATE TABLE Categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            );
            CREATE TABLE Product_Categories (
                product_id INTEGER,
                category_id INTEGER,
                PRIMARY KEY (product_id, category_id),
                FOREIGN KEY (product_id) REFERENCES Products(id),
                FOREIGN KEY (category_id) REFERENCES Categories(id)
            );
        `,
        seeds: [
            "INSERT INTO Customers (first_name, last_name, email, city, discount_level) VALUES ('Béla', 'Kovács', 'bela@gmail.com', 'Budapest', 10), ('Anna', 'Nagy', 'anna@gmail.com', 'Debrecen', 0), ('Gábor', 'Tóth', 'gabor@gmail.com', 'Szeged', 5), ('Zoltán', 'Kiss', 'zoltan@citromail.hu', 'Budapest', 20), ('Mária', 'Horváth', 'maria@freemail.hu', 'Győr', 0), ('Eszter', 'Farkas', 'eszter@gmail.com', 'Pécs', 15);",
            "INSERT INTO Products (name, price, stock_quantity) VALUES ('Laptop Pro', 450000, 5), ('USB Egér', 4500, 100), ('Mechanikus Billentyűzet', 28000, 25), ('4K Monitor', 120000, 12), ('Webkamera', 15000, 0), ('Külső SSD', 35000, 40);",
            "INSERT INTO Categories (name) VALUES ('Elektronika'), ('Perifériák'), ('Számítástechnika'), ('Akciós');",
            "INSERT INTO Product_Categories (product_id, category_id) VALUES (1, 1), (1, 3), (2, 2), (3, 2), (4, 1), (5, 2), (6, 3);",
            "INSERT INTO Orders (customer_id, status, total_amount, order_date) VALUES (1, 'SHIPPED', 454500, '2024-03-01'), (2, 'PENDING', 120000, '2024-03-02'), (3, 'SHIPPED', 28000, '2024-02-28'), (4, 'CANCELLED', 4500, '2024-03-01'), (1, 'SHIPPED', 35000, '2024-03-05'), (5, 'PENDING', 478000, '2024-03-10');",
            "INSERT INTO Order_Items (order_id, product_id, quantity, unit_price) VALUES (1, 1, 1, 450000), (1, 2, 1, 4500), (2, 4, 1, 120000), (3, 3, 1, 28000), (4, 2, 1, 4500), (5, 6, 1, 35000), (6, 1, 1, 450000), (6, 3, 1, 28000);"
        ]
    },
    {
        name: 'sql_2.db',
        schema: `
            DROP TABLE IF EXISTS Enrollments;
            DROP TABLE IF EXISTS Courses;
            DROP TABLE IF EXISTS Classrooms;
            DROP TABLE IF EXISTS Teachers;
            DROP TABLE IF EXISTS Students;
            CREATE TABLE Students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                class TEXT,
                birth_date DATE,
                gpa REAL
            );
            CREATE TABLE Teachers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                subject TEXT,
                email TEXT,
                hire_date DATE
            );
            CREATE TABLE Courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                teacher_id INTEGER,
                credits INTEGER,
                semester TEXT,
                FOREIGN KEY (teacher_id) REFERENCES Teachers(id)
            );
            CREATE TABLE Enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER,
                course_id INTEGER,
                grade INTEGER,
                enroll_date DATE,
                FOREIGN KEY (student_id) REFERENCES Students(id),
                FOREIGN KEY (course_id) REFERENCES Courses(id)
            );
            CREATE TABLE Classrooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                building TEXT,
                room_number TEXT,
                capacity INTEGER
            );
        `,
        seeds: [
            "INSERT INTO Students (name, class, birth_date, gpa) VALUES ('Szabó Petra', '10.A', '2008-03-15', 4.5), ('Kiss Máté', '11.B', '2007-07-22', 3.8), ('Nagy Emma', '10.A', '2008-11-01', 4.9), ('Tóth Dávid', '12.C', '2006-05-30', 3.2), ('Varga Lili', '11.B', '2007-09-14', 4.1), ('Molnár Ádám', '10.A', '2008-01-20', 3.6), ('Fekete Réka', '12.C', '2006-12-08', 4.7);",
            "INSERT INTO Teachers (name, subject, email, hire_date) VALUES ('Molnár János', 'Matematika', 'molnar.j@iskola.hu', '2015-09-01'), ('Fehér Katalin', 'Informatika', 'feher.k@iskola.hu', '2018-02-15'), ('Balogh Péter', 'Fizika', 'balogh.p@iskola.hu', '2012-09-01'), ('Lakatos Éva', 'Angol', 'lakatos.e@iskola.hu', '2020-09-01');",
            "INSERT INTO Courses (title, teacher_id, credits, semester) VALUES ('Matematika', 1, 5, '2024/1'), ('Programozás', 2, 4, '2024/1'), ('Fizika', 3, 4, '2024/1'), ('Angol nyelv', 4, 3, '2024/2'), ('Adatbázisok', 2, 4, '2024/2');",
            "INSERT INTO Enrollments (student_id, course_id, grade, enroll_date) VALUES (1, 1, 5, '2024-09-01'), (1, 2, 4, '2024-09-01'), (2, 1, 3, '2024-09-01'), (2, 3, 4, '2024-09-01'), (3, 2, 5, '2024-09-01'), (4, 4, 3, '2024-02-01'), (5, 1, 4, '2024-09-01'), (5, 5, 5, '2024-02-01'), (6, 2, 3, '2024-09-01'), (7, 4, 5, '2024-02-01'), (3, 1, 5, '2024-09-01');",
            "INSERT INTO Classrooms (building, room_number, capacity) VALUES ('A', '101', 30), ('A', '202', 25), ('B', '105', 35), ('B', '301', 20), ('C', '001', 40);"
        ]
    },
    {
        name: 'sql_3.db',
        schema: `
            DROP TABLE IF EXISTS Loans;
            DROP TABLE IF EXISTS Books;
            DROP TABLE IF EXISTS Authors;
            DROP TABLE IF EXISTS Members;
            DROP TABLE IF EXISTS Categories;
            CREATE TABLE Authors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                nationality TEXT,
                birth_year INTEGER
            );
            CREATE TABLE Categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            );
            CREATE TABLE Books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author_id INTEGER,
                isbn TEXT,
                published_year INTEGER,
                genre TEXT,
                available_copies INTEGER DEFAULT 1,
                FOREIGN KEY (author_id) REFERENCES Authors(id)
            );
            CREATE TABLE Members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                membership_type TEXT DEFAULT 'BASIC',
                join_date DATE
            );
            CREATE TABLE Loans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id INTEGER,
                member_id INTEGER,
                loan_date DATE,
                due_date DATE,
                returned_date DATE,
                FOREIGN KEY (book_id) REFERENCES Books(id),
                FOREIGN KEY (member_id) REFERENCES Members(id)
            );
        `,
        seeds: [
            "INSERT INTO Authors (name, nationality, birth_year) VALUES ('Molnár Ferenc', 'magyar', 1878), ('Gárdonyi Géza', 'magyar', 1863), ('J.K. Rowling', 'brit', 1965), ('George Orwell', 'brit', 1903), ('Saint-Exupéry', 'francia', 1900), ('Robert C. Martin', 'amerikai', 1952);",
            "INSERT INTO Categories (name) VALUES ('Regény'), ('Sci-fi'), ('Gyerekkönyv'), ('Szakkönyv'), ('Történelmi');",
            "INSERT INTO Books (title, author_id, isbn, published_year, genre, available_copies) VALUES ('A Pál utcai fiúk', 1, '978-963-07-1234', 1906, 'Regény', 3), ('Egri csillagok', 2, '978-963-07-5678', 1899, 'Történelmi', 2), ('Harry Potter és a bölcsek köve', 3, '978-0-7475-3269', 1997, 'Fantasy', 5), ('1984', 4, '978-0-451-52493', 1949, 'Sci-fi', 1), ('A kis herceg', 5, '978-963-11-9876', 1943, 'Gyerekkönyv', 4), ('Clean Code', 6, '978-0-13-235088', 2008, 'Szakkönyv', 2);",
            "INSERT INTO Members (name, email, membership_type, join_date) VALUES ('Kis Péter', 'kis.peter@gmail.com', 'BASIC', '2023-01-15'), ('Nagy Réka', 'nagy.reka@gmail.com', 'PREMIUM', '2022-06-01'), ('Szabó Tamás', 'szabo.t@freemail.hu', 'BASIC', '2023-09-10'), ('Varga Anita', 'varga.a@gmail.com', 'PREMIUM', '2021-03-20'), ('Tóth Bence', 'toth.b@citromail.hu', 'BASIC', '2024-01-05'), ('Fekete Laura', 'fekete.l@gmail.com', 'PREMIUM', '2022-11-15'), ('Molnár Gergő', 'molnar.g@gmail.com', 'BASIC', '2023-07-22'), ('Kiss Dóra', 'kiss.d@gmail.com', 'PREMIUM', '2020-09-01');",
            "INSERT INTO Loans (book_id, member_id, loan_date, due_date, returned_date) VALUES (1, 1, '2024-02-01', '2024-02-15', '2024-02-14'), (3, 2, '2024-02-10', '2024-02-24', NULL), (4, 3, '2024-01-20', '2024-02-03', '2024-02-05'), (2, 4, '2024-03-01', '2024-03-15', NULL), (5, 1, '2024-03-05', '2024-03-19', '2024-03-18'), (6, 6, '2024-02-20', '2024-03-05', NULL), (3, 5, '2024-03-10', '2024-03-24', NULL), (1, 7, '2024-01-10', '2024-01-24', '2024-01-23');"
        ]
    },
    {
        name: 'sql_4.db',
        schema: `
            DROP TABLE IF EXISTS Order_Items;
            DROP TABLE IF EXISTS Orders;
            DROP TABLE IF EXISTS Tables_Info;
            DROP TABLE IF EXISTS Waiters;
            DROP TABLE IF EXISTS Menu_Items;
            CREATE TABLE Menu_Items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT,
                price REAL NOT NULL,
                is_vegetarian INTEGER DEFAULT 0
            );
            CREATE TABLE Waiters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                hire_date DATE,
                hourly_rate REAL
            );
            CREATE TABLE Tables_Info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_number INTEGER,
                seats INTEGER,
                location TEXT
            );
            CREATE TABLE Orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_id INTEGER,
                waiter_id INTEGER,
                order_date DATETIME,
                status TEXT,
                total_amount REAL,
                FOREIGN KEY (table_id) REFERENCES Tables_Info(id),
                FOREIGN KEY (waiter_id) REFERENCES Waiters(id)
            );
            CREATE TABLE Order_Items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                menu_item_id INTEGER,
                quantity INTEGER,
                FOREIGN KEY (order_id) REFERENCES Orders(id),
                FOREIGN KEY (menu_item_id) REFERENCES Menu_Items(id)
            );
        `,
        seeds: [
            "INSERT INTO Menu_Items (name, category, price, is_vegetarian) VALUES ('Gulyásleves', 'ELŐÉTEL', 2500, 0), ('Bécsi szelet', 'FŐÉTEL', 3800, 0), ('Somlói galuska', 'DESSZERT', 1800, 1), ('Túrós csusza', 'FŐÉTEL', 2200, 1), ('Limonádé', 'ITAL', 800, 1), ('Házi limonádé', 'ITAL', 1200, 1), ('Rántott sajt', 'FŐÉTEL', 2800, 1), ('Töltött káposzta', 'FŐÉTEL', 3200, 0), ('Palacsinta', 'DESSZERT', 1500, 1), ('Sör (0.5l)', 'ITAL', 900, 1);",
            "INSERT INTO Waiters (name, hire_date, hourly_rate) VALUES ('Kovács Tamás', '2021-03-15', 2200), ('Szabó Éva', '2022-06-01', 2000), ('Nagy Bence', '2020-01-10', 2500), ('Fehér Anna', '2023-09-01', 1800);",
            "INSERT INTO Tables_Info (table_number, seats, location) VALUES (1, 2, 'TERASZ'), (2, 4, 'BELSŐ'), (3, 6, 'BELSŐ'), (4, 4, 'TERASZ'), (5, 2, 'VIP'), (6, 8, 'BELSŐ'), (7, 4, 'VIP'), (8, 2, 'TERASZ');",
            "INSERT INTO Orders (table_id, waiter_id, order_date, status, total_amount) VALUES (1, 1, '2024-03-15 12:30', 'PAID', 7100), (3, 2, '2024-03-15 13:00', 'PAID', 12400), (5, 3, '2024-03-15 19:00', 'OPEN', 8200), (2, 1, '2024-03-16 12:00', 'PAID', 5000), (4, 4, '2024-03-16 18:30', 'CANCELLED', 3800), (6, 2, '2024-03-16 19:30', 'OPEN', 15600), (7, 3, '2024-03-17 20:00', 'PAID', 9800);",
            "INSERT INTO Order_Items (order_id, menu_item_id, quantity) VALUES (1, 1, 1), (1, 2, 1), (1, 5, 1), (2, 2, 2), (2, 8, 1), (2, 3, 2), (3, 7, 1), (3, 4, 1), (3, 6, 2), (3, 9, 1), (4, 4, 1), (4, 7, 1), (6, 1, 2), (6, 2, 2), (6, 8, 1), (6, 10, 4), (7, 2, 2), (7, 3, 1), (7, 6, 1);"
        ]
    },
    {
        name: 'sql_5.db',
        schema: `
            DROP TABLE IF EXISTS Registrations;
            DROP TABLE IF EXISTS Memberships;
            DROP TABLE IF EXISTS Classes;
            DROP TABLE IF EXISTS Trainers;
            DROP TABLE IF EXISTS Members;
            CREATE TABLE Members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                birth_date DATE,
                membership_type TEXT DEFAULT 'BASIC'
            );
            CREATE TABLE Trainers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                specialization TEXT,
                hourly_rate REAL
            );
            CREATE TABLE Classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                trainer_id INTEGER,
                max_participants INTEGER,
                day_of_week TEXT,
                start_time TEXT,
                FOREIGN KEY (trainer_id) REFERENCES Trainers(id)
            );
            CREATE TABLE Registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER,
                class_id INTEGER,
                registration_date DATE,
                FOREIGN KEY (member_id) REFERENCES Members(id),
                FOREIGN KEY (class_id) REFERENCES Classes(id)
            );
            CREATE TABLE Memberships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER,
                start_date DATE,
                end_date DATE,
                monthly_fee REAL,
                is_active INTEGER DEFAULT 1,
                FOREIGN KEY (member_id) REFERENCES Members(id)
            );
        `,
        seeds: [
            "INSERT INTO Members (name, email, birth_date, membership_type) VALUES ('Kovács Anna', 'kovacs.a@gmail.com', '1995-04-12', 'PREMIUM'), ('Szabó Péter', 'szabo.p@gmail.com', '1988-11-30', 'VIP'), ('Nagy Réka', 'nagy.r@freemail.hu', '2000-07-05', 'BASIC'), ('Tóth Gergő', 'toth.g@gmail.com', '1992-01-18', 'PREMIUM'), ('Varga Dóra', 'varga.d@citromail.hu', '1998-09-22', 'BASIC'), ('Kiss Balázs', 'kiss.b@gmail.com', '1985-03-08', 'VIP'), ('Fekete Lilla', 'fekete.l@gmail.com', '2001-12-14', 'BASIC'), ('Molnár Dániel', 'molnar.d@gmail.com', '1990-06-25', 'PREMIUM');",
            "INSERT INTO Trainers (name, specialization, hourly_rate) VALUES ('Kovács Tamás', 'Erőnléti', 5000), ('Szabó Réka', 'Jóga', 4500), ('Nagy Bence', 'CrossFit', 6000), ('Fehér Anna', 'Úszás', 5500);",
            "INSERT INTO Classes (name, trainer_id, max_participants, day_of_week, start_time) VALUES ('Jóga', 2, 15, 'Hétfő', '08:00'), ('CrossFit', 3, 12, 'Kedd', '17:00'), ('Spinning', 1, 20, 'Szerda', '18:00'), ('Úszás', 4, 10, 'Csütörtök', '07:00'), ('Box', 1, 8, 'Péntek', '16:00'), ('TRX', 3, 10, 'Szombat', '10:00');",
            "INSERT INTO Registrations (member_id, class_id, registration_date) VALUES (1, 1, '2024-03-01'), (1, 3, '2024-03-01'), (2, 2, '2024-03-02'), (3, 1, '2024-03-05'), (4, 2, '2024-03-03'), (4, 5, '2024-03-03'), (5, 4, '2024-03-10'), (6, 2, '2024-03-01'), (6, 6, '2024-03-01'), (7, 1, '2024-03-08'), (8, 3, '2024-03-12'), (8, 5, '2024-03-12');",
            "INSERT INTO Memberships (member_id, start_date, end_date, monthly_fee, is_active) VALUES (1, '2024-01-01', '2024-12-31', 15000, 1), (2, '2024-01-01', '2024-12-31', 25000, 1), (3, '2024-03-01', '2024-08-31', 8000, 1), (4, '2024-02-01', '2024-07-31', 15000, 1), (5, '2023-06-01', '2024-01-31', 8000, 0), (6, '2024-01-01', '2024-12-31', 25000, 1), (7, '2024-03-01', '2024-05-31', 8000, 1), (8, '2023-09-01', '2024-08-31', 15000, 1);"
        ]
    }
];

dbs.forEach(dbInfo => {
    const dbPath = path.join(targetDir, dbInfo.name);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        dbInfo.schema.split(';').filter(s => s.trim()).forEach(stmt => {
            db.run(stmt);
        });
        dbInfo.seeds.forEach(seed => {
            db.run(seed);
        });
    });
    db.close((err) => {
        if (err) console.error(`Error closing ${dbInfo.name}:`, err);
        else console.log(`Created and seeded ${dbInfo.name}`);
    });
});
