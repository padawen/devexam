// 5 different SQL database schemas for junior-level interview practice.
// Each schema includes a text description (for AI prompt) and maps to sql_1.db ... sql_5.db

export interface SqlSchemaInfo {
    index: number;       // 1-5, maps to sql_{index}.db
    name: string;        // Human-readable name
    description: string; // Full schema description for AI prompt
}

const SQL_SCHEMA_LIST: SqlSchemaInfo[] = [
    {
        index: 1,
        name: 'Webshop',
        description: `**ADATBÁZIS SÉMA: Webshop**
- **Customers** (id, first_name, last_name, email, city, discount_level)
- **Products** (id, name, price, stock_quantity)
- **Orders** (id, customer_id, order_date, status[SHIPPED, PENDING, CANCELLED], total_amount)
- **Order_Items** (id, order_id, product_id, quantity, unit_price)
- **Categories** (id, name)
- **Product_Categories** (product_id, category_id)

**PÉLDA ADATOK:**
- Ügyfelek: Kovács Béla (Budapest), Nagy Anna (Debrecen), Tóth Gábor (Szeged), Kiss Zoltán (Budapest), Horváth Mária (Győr)
- Termékek: Laptop Pro (450000 Ft), USB Egér (4500 Ft), Billentyűzet (28000 Ft), 4K Monitor (120000 Ft), Webkamera (15000 Ft), Külső SSD (35000 Ft)
- Kategóriák: Elektronika, Perifériák, Számítástechnika, Akciós
- Rendelések státuszai: SHIPPED, PENDING, CANCELLED`
    },
    {
        index: 2,
        name: 'Iskola',
        description: `**ADATBÁZIS SÉMA: Iskola**
- **Students** (id, name, class, birth_date, gpa)
- **Teachers** (id, name, subject, email, hire_date)
- **Courses** (id, title, teacher_id, credits, semester)
- **Enrollments** (id, student_id, course_id, grade, enroll_date)
- **Classrooms** (id, building, room_number, capacity)

**PÉLDA ADATOK:**
- Diákok: Szabó Petra (10.A, GPA: 4.5), Kiss Máté (11.B, GPA: 3.8), Nagy Emma (10.A, GPA: 4.9), Tóth Dávid (12.C, GPA: 3.2), Varga Lili (11.B, GPA: 4.1)
- Tanárok: Molnár János (Matematika), Fehér Katalin (Informatika), Balogh Péter (Fizika), Lakatos Éva (Angol)
- Tantárgyak: Matematika, Programozás, Fizika, Angol nyelv, Adatbázisok
- Jegyek: 1-5, Félévek: 2024/1, 2024/2`
    },
    {
        index: 3,
        name: 'Könyvtár',
        description: `**ADATBÁZIS SÉMA: Könyvtár**
- **Books** (id, title, author_id, isbn, published_year, genre, available_copies)
- **Authors** (id, name, nationality, birth_year)
- **Members** (id, name, email, membership_type[BASIC, PREMIUM], join_date)
- **Loans** (id, book_id, member_id, loan_date, due_date, returned_date)
- **Categories** (id, name)

**PÉLDA ADATOK:**
- Könyvek: A Pál utcai fiúk, Egri csillagok, Harry Potter, 1984, A kis herceg, Clean Code
- Szerzők: Molnár Ferenc, Gárdonyi Géza, J.K. Rowling, George Orwell, Saint-Exupéry, Robert C. Martin
- Tagok: 8 tag (4 BASIC, 4 PREMIUM)
- Kölcsönzések: aktív és visszahozott kölcsönzések vegyesen`
    },
    {
        index: 4,
        name: 'Étterem',
        description: `**ADATBÁZIS SÉMA: Étterem**
- **Menu_Items** (id, name, category[ELŐÉTEL, FŐÉTEL, DESSZERT, ITAL], price, is_vegetarian)
- **Waiters** (id, name, hire_date, hourly_rate)
- **Tables** (id, table_number, seats, location[TERASZ, BELSŐ, VIP])
- **Orders** (id, table_id, waiter_id, order_date, status[OPEN, PAID, CANCELLED], total_amount)
- **Order_Items** (id, order_id, menu_item_id, quantity)

**PÉLDA ADATOK:**
- Ételek: Gulyásleves (2500 Ft), Bécsi szelet (3800 Ft), Somlói galuska (1800 Ft), Túrós csusza (2200 Ft), Limonádé (800 Ft)
- Pincérek: 4 fő, különböző órabérekkel
- Asztalok: 8 db (TERASZ, BELSŐ, VIP helyszínek)
- Rendelések: aktív, fizetett és sztornózott rendelések`
    },
    {
        index: 5,
        name: 'Edzőterem',
        description: `**ADATBÁZIS SÉMA: Edzőterem**
- **Members** (id, name, email, birth_date, membership_type[BASIC, PREMIUM, VIP])
- **Trainers** (id, name, specialization, hourly_rate)
- **Classes** (id, name, trainer_id, max_participants, day_of_week, start_time)
- **Registrations** (id, member_id, class_id, registration_date)
- **Memberships** (id, member_id, start_date, end_date, monthly_fee, is_active)

**PÉLDA ADATOK:**
- Tagok: 8 fő (BASIC, PREMIUM, VIP tagságok vegyesen)
- Edzők: Kovács Tamás (Erőnléti), Szabó Réka (Jóga), Nagy Bence (CrossFit), Fehér Anna (Úszás)
- Órák: Jóga, CrossFit, Spinning, Úszás, Box, TRX
- Havidíjak: BASIC (8000), PREMIUM (15000), VIP (25000)`
    }
];

/**
 * Returns a random SQL schema info for test generation.
 */
export function getRandomSqlSchema(): SqlSchemaInfo {
    const idx = Math.floor(Math.random() * SQL_SCHEMA_LIST.length);
    return SQL_SCHEMA_LIST[idx];
}

/**
 * Returns SQL schema info by index (1-5).
 */
export function getSqlSchemaByIndex(index: number): SqlSchemaInfo | undefined {
    return SQL_SCHEMA_LIST.find(s => s.index === index);
}

export { SQL_SCHEMA_LIST };
