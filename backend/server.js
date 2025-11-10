require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', 
    password: '1350Zlata0531!',
    database: 'fitnesshub'
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Токен отсутствует' });
    }

    jwt.verify(token, 'fitnesshub_secret_key_2024', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Неверный токен' });
        }
        req.user = user;
        next();
    });
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ success: false, error: 'Доступ запрещен' });
        }
        next();
    };
};

function formatTimeSimply(time) {
    if (!time) return '10:00';
    try {
        if (typeof time === 'string') {
            return time.substring(0, 5);
        }
        return '10:00';
    } catch (error) {
        return '10:00';
    }
}

function getDayOfWeek(dateString) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const date = new Date(dateString);
    return days[date.getDay()];
}

async function testDB() {
    try {
        const connection = await pool.getConnection();
        console.log('Успешное подключение к MySQL');
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('Таблицы в базе:', tables.map(t => t.Tables_in_fitnesshub));
        connection.release();
    } catch (error) {
        console.log('Ошибка подключения к MySQL:', error.message);
    }
}

app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Сервер работает!',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        message: 'FitnessHub API работает!',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role = 'client' } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Все поля обязательны' 
            });
        }

        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Пользователь с таким email уже существует' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        );
        
        const token = jwt.sign(
            { 
                userId: result.insertId, 
                email: email, 
                role: role 
            },
            'fitnesshub_secret_key_2024',
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true,
            message: 'Регистрация успешна!',
            token: token,
            user: {
                id: result.insertId,
                name: name,
                email: email,
                role: role
            }
        });
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера: ' + error.message 
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email и пароль обязательны' 
            });
        }

        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ 
                success: false,
                error: 'Неверный email или пароль' 
            });
        }
        
        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Неверный email или пароль' 
            });
        }

        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            'fitnesshub_secret_key_2024',
            { expiresIn: '24h' }
        );
        
        res.json({ 
            success: true,
            message: 'Вход выполнен успешно!',
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Ошибка логина:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера: ' + error.message 
        });
    }
});

app.get('/api/public/trainers', async (req, res) => {
    try {
        const [trainers] = await pool.execute(`
            SELECT 
                t.id,
                t.user_id,
                t.experience,
                t.specialization,
                t.bio,
                t.rating,
                t.is_active,
                u.name,
                u.email
            FROM trainers t
            JOIN users u ON t.user_id = u.id
            WHERE t.is_active = 1
            ORDER BY t.rating DESC
        `);
        
        res.json({ success: true, trainers });
    } catch (error) {
        console.error('Ошибка получения тренеров:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});

app.get('/api/public/subscriptions', async (req, res) => {
    try {
        const [subscriptions] = await pool.execute(`
            SELECT * FROM subscription_types 
            WHERE is_active = TRUE 
            ORDER BY price ASC
        `);
        
        res.json({ 
            success: true, 
            subscriptions 
        });
        
    } catch (error) {
        console.error('Ошибка получения абонементов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера: ' + error.message 
        });
    }
});

app.get('/api/public/group-sessions', async (req, res) => {
    try {
        const [sessions] = await pool.execute(`
            SELECT 
                gs.*,
                u.name as trainer_name,
                t.id as trainer_id
            FROM group_sessions gs
            LEFT JOIN trainers t ON gs.trainer_id = t.id
            LEFT JOIN users u ON t.user_id = u.id
            WHERE gs.is_active = TRUE
            ORDER BY gs.name
        `);
        
        const formattedSessions = sessions.map(session => ({
            id: session.id,
            name: session.name,
            description: session.description || '',
            days: session.days || '',
            time: formatTimeSimply(session.time),
            duration: session.duration || 60,
            max_participants: session.max_participants || 10,
            current_participants: session.current_participants || 0,
            is_active: Boolean(session.is_active),
            trainer_id: session.trainer_id || null,
            trainer_name: session.trainer_name || 'Тренер',
            created_at: session.created_at,
            updated_at: session.updated_at
        }));
        
        res.json({ 
            success: true, 
            sessions: formattedSessions
        });
        
    } catch (error) {
        console.error('Ошибка получения групповых занятий для клиентов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера: ' + error.message
        });
    }
});

app.get('/api/trainers', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [trainers] = await pool.execute(`
            SELECT 
                t.id,
                t.user_id,
                u.name,
                u.email,
                u.phone,
                t.experience,
                t.specialization,
                t.bio,
                t.rating,
                t.is_active
            FROM trainers t 
            JOIN users u ON t.user_id = u.id 
            ORDER BY t.id DESC
        `);
        
        res.json({ success: true, trainers });
        
    } catch (error) {
        console.error('Ошибка получения тренеров для админа:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});

app.post('/api/trainers', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { name, email, password, phone, experience, specialization, bio } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Обязательные поля: имя, email, пароль' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [userResult] = await pool.execute(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone, 'trainer']
        );

        const [trainerResult] = await pool.execute(
            'INSERT INTO trainers (user_id, experience, specialization, bio) VALUES (?, ?, ?, ?)',
            [userResult.insertId, experience, specialization, bio]
        );

        res.json({ 
            success: true, 
            message: 'Тренер успешно создан',
            trainer: {
                id: trainerResult.insertId,
                user_id: userResult.insertId,
                name,
                email,
                phone,
                experience,
                specialization,
                bio
            }
        });
    } catch (error) {
        console.error('Ошибка создания тренера:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});

app.put('/api/trainers/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const trainerId = req.params.id;
        const { name, email, phone, experience, specialization, bio, is_active, password } = req.body;

        const [trainerData] = await pool.execute(
            'SELECT user_id FROM trainers WHERE id = ?',
            [trainerId]
        );

        if (trainerData.length === 0) {
            return res.status(404).json({ success: false, error: 'Тренер не найден' });
        }

        const userId = trainerData[0].user_id;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.execute(
                'UPDATE users SET name = ?, email = ?, phone = ?, password = ? WHERE id = ?',
                [name, email, phone, hashedPassword, userId]
            );
        } else {
            await pool.execute(
                'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?',
                [name, email, phone, userId]
            );
        }

        await pool.execute(
            'UPDATE trainers SET experience = ?, specialization = ?, bio = ?, is_active = ? WHERE id = ?',
            [experience, specialization, bio, is_active, trainerId]
        );

        res.json({ success: true, message: 'Тренер успешно обновлен' });
    } catch (error) {
        console.error('Ошибка обновления тренера:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.delete('/api/trainers/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const trainerId = req.params.id;

        const [trainerData] = await pool.execute(
            'SELECT user_id FROM trainers WHERE id = ?',
            [trainerId]
        );

        if (trainerData.length === 0) {
            return res.status(404).json({ success: false, error: 'Тренер не найден' });
        }

        const userId = trainerData[0].user_id;
        await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

        res.json({ success: true, message: 'Тренер успешно удален' });
    } catch (error) {
        console.error('Ошибка удаления тренера:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/trainer/group-sessions', authenticateToken, requireRole('trainer'), async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [trainerRows] = await pool.execute(
            'SELECT id FROM trainers WHERE user_id = ?',
            [userId]
        );
        
        if (trainerRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Тренер не найден' });
        }
        
        const trainerId = trainerRows[0].id;
        
        const [sessions] = await pool.execute(`
            SELECT 
                gs.*,
                u.name as trainer_name
            FROM group_sessions gs
            LEFT JOIN trainers t ON gs.trainer_id = t.id
            LEFT JOIN users u ON t.user_id = u.id
            WHERE gs.trainer_id = ?
            ORDER BY gs.name
        `, [trainerId]);
        
        const formattedSessions = sessions.map(session => ({
            ...session,
            time: formatTimeSimply(session.time),
            is_active: Boolean(session.is_active),
            current_participants: session.current_participants || 0
        }));
        
        res.json({ 
            success: true, 
            sessions: formattedSessions 
        });
        
    } catch (error) {
        console.error('Ошибка получения group_sessions тренера:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера: ' + error.message 
        });
    }
});

app.get('/api/class-types', authenticateToken, async (req, res) => {
    try {
        const [classTypes] = await pool.execute('SELECT * FROM class_types WHERE is_active = TRUE');
        res.json({ success: true, classTypes });
    } catch (error) {
        console.error('Ошибка получения типов занятий:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.post('/api/class-types', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { name, description, difficulty } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Название обязательно' });
        }

        const [result] = await pool.execute(
            'INSERT INTO class_types (name, description, difficulty) VALUES (?, ?, ?)',
            [name, description, difficulty]
        );

        res.json({ 
            success: true, 
            message: 'Тип занятия успешно создан',
            classType: {
                id: result.insertId,
                name,
                description,
                difficulty
            }
        });
    } catch (error) {
        console.error('Ошибка создания типа занятия:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.put('/api/class-types/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const classTypeId = req.params.id;
        const { name, description, difficulty, is_active } = req.body;

        const [result] = await pool.execute(
            'UPDATE class_types SET name = ?, description = ?, difficulty = ?, is_active = ? WHERE id = ?',
            [name, description, difficulty, is_active, classTypeId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Тип занятия не найден' });
        }

        res.json({ success: true, message: 'Тип занятия успешно обновлен' });
    } catch (error) {
        console.error('Ошибка обновления типа занятия:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/group-sessions', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [sessions] = await pool.execute(`
            SELECT 
                gs.*,
                u.name as trainer_name,
                t.id as trainer_id
            FROM group_sessions gs
            LEFT JOIN trainers t ON gs.trainer_id = t.id
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY gs.id DESC
        `);
        
        const formattedSessions = sessions.map(session => ({
            id: session.id,
            name: session.name,
            description: session.description || '',
            days: session.days || '',
            time: formatTimeSimply(session.time),
            duration: session.duration || 60,
            max_participants: session.max_participants || 10,
            current_participants: session.current_participants || 0,
            is_active: Boolean(session.is_active),
            trainer_id: session.trainer_id || null,
            trainer_name: session.trainer_name || null,
            created_at: session.created_at,
            updated_at: session.updated_at
        }));
        
        res.json({ 
            success: true, 
            sessions: formattedSessions
        });
        
    } catch (error) {
        console.error('Ошибка получения групповых занятий:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера: ' + error.message
        });
    }
});

app.get('/api/group-sessions/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const [sessions] = await pool.execute(`
            SELECT 
                gs.*,
                u.name as trainer_name,
                t.id as trainer_id
            FROM group_sessions gs
            LEFT JOIN trainers t ON gs.trainer_id = t.id
            LEFT JOIN users u ON t.user_id = u.id
            WHERE gs.id = ?
        `, [id]);
        
        if (sessions.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Занятие не найдено' 
            });
        }
        
        const session = sessions[0];
        const formattedSession = {
            ...session,
            time: formatTimeSimply(session.time),
            is_active: Boolean(session.is_active)
        };
        
        res.json({ 
            success: true, 
            session: formattedSession 
        });
    } catch (error) {
        console.error('Ошибка загрузки занятия:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера: ' + error.message 
        });
    }
});

app.post('/api/group-sessions', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { name, description, days, time, max_participants, duration, trainer_id } = req.body;
        
        if (!name || !days || !time || !max_participants || !duration) {
            return res.status(400).json({ 
                success: false, 
                error: 'Все поля обязательны' 
            });
        }

        const mysqlTime = time.length === 5 ? time + ':00' : time;
        const selectedDays = Array.isArray(days) ? days.join(',') : days;
        
        const [result] = await pool.execute(
            `INSERT INTO group_sessions 
             (name, description, days, time, max_participants, duration, trainer_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, description, selectedDays, mysqlTime, max_participants, duration, trainer_id || null]
        );
        
        res.json({ 
            success: true, 
            message: 'Групповое занятие создано',
            sessionId: result.insertId 
        });
    } catch (error) {
        console.error('Ошибка создания занятия:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера: ' + error.message 
        });
    }
});

app.put('/api/group-sessions/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, days, time, max_participants, duration, is_active, trainer_id } = req.body;
        
        const mysqlTime = time && time.length === 5 ? time + ':00' : time;
        const selectedDays = Array.isArray(days) ? days.join(',') : days;
        
        const [result] = await pool.execute(
            `UPDATE group_sessions 
             SET name = ?, description = ?, days = ?, time = ?, 
                 max_participants = ?, duration = ?, is_active = ?, trainer_id = ?
             WHERE id = ?`,
            [name, description, selectedDays, mysqlTime, max_participants, duration, is_active, trainer_id || null, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Занятие не найдено' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Занятие обновлено'
        });
    } catch (error) {
        console.error('Ошибка обновления занятия:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера: ' + error.message 
        });
    }
});

app.delete('/api/group-sessions/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const [sessions] = await pool.execute(
            'SELECT * FROM group_sessions WHERE id = ?',
            [id]
        );
        
        if (sessions.length === 0) {
            return res.status(404).json({ success: false, error: 'Занятие не найдено' });
        }
        
        await pool.execute(
            'DELETE FROM group_sessions WHERE id = ?',
            [id]
        );
        
        res.json({ 
            success: true, 
            message: 'Занятие удалено',
            session: sessions[0] 
        });
    } catch (error) {
        console.error('Ошибка удаления занятия:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/subscriptions', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [subscriptions] = await pool.execute(`
            SELECT * FROM subscription_types ORDER BY type, price
        `);
        
        const formattedSubscriptions = subscriptions.map(sub => ({
            ...sub,
            is_active: Boolean(sub.is_active)
        }));
        
        res.json({ success: true, subscriptions: formattedSubscriptions });
    } catch (error) {
        console.error('Ошибка получения абонементов:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/subscriptions', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { name, type, description, price, visits_count, duration_days, is_active = true } = req.body;
        
        const isActiveTinyint = is_active ? 1 : 0;
        
        const [result] = await pool.execute(
            'INSERT INTO subscription_types (name, type, description, price, visits_count, duration_days, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, type, description, price, visits_count, duration_days, isActiveTinyint]
        );

        res.json({ 
            success: true, 
            message: 'Абонемент создан',
            subscriptionId: result.insertId 
        });
    } catch (error) {
        console.error('Ошибка создания абонемента:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/subscriptions/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const subscriptionId = req.params.id;
        const { name, type, description, price, visits_count, duration_days, is_active } = req.body;
        
        const isActiveTinyint = is_active ? 1 : 0;
        
        const [result] = await pool.execute(
            'UPDATE subscription_types SET name = ?, type = ?, description = ?, price = ?, visits_count = ?, duration_days = ?, is_active = ? WHERE id = ?',
            [name, type, description, price, visits_count, duration_days, isActiveTinyint, subscriptionId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Абонемент не найден' });
        }

        res.json({ success: true, message: 'Абонемент обновлен' });
    } catch (error) {
        console.error('Ошибка обновления абонемента:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/subscriptions/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const subscriptionId = req.params.id;
        
        const [subscriptions] = await pool.execute(
            'SELECT * FROM subscription_types WHERE id = ?',
            [subscriptionId]
        );
        
        if (subscriptions.length === 0) {
            return res.status(404).json({ success: false, error: 'Абонемент не найден' });
        }

        await pool.execute(
            'DELETE FROM subscription_types WHERE id = ?',
            [subscriptionId]
        );
        
        res.json({ 
            success: true, 
            message: 'Абонемент удален',
            subscription: subscriptions[0] 
        });
    } catch (error) {
        console.error('Ошибка удаления абонемента:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/users', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT id, name, email, phone, role, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
        
        res.json({ success: true, users });
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/stats', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [[{totalClients}]] = await pool.execute(
            "SELECT COUNT(*) as totalClients FROM users WHERE role = 'client'"
        );
        const [[{activeTrainers}]] = await pool.execute(
            "SELECT COUNT(*) as activeTrainers FROM trainers WHERE is_active = TRUE"
        );
       const [[{todaySessions}]] = await pool.execute(
            "SELECT COUNT(*) as todaySessions FROM group_sessions WHERE is_active = 1"
        );
        const [[{monthlyRevenue}]] = await pool.execute(`
            SELECT COALESCE(SUM(st.price), 0) as monthlyRevenue 
            FROM user_subscriptions us 
            JOIN subscription_types st ON us.subscription_type_id = st.id 
            WHERE MONTH(us.purchase_date) = MONTH(CURDATE()) 
            AND YEAR(us.purchase_date) = YEAR(CURDATE())
            AND us.status = 'active'
        `);

        res.json({
            success: true,
            stats: {
                totalClients: parseInt(totalClients),
                activeTrainers: parseInt(activeTrainers),
                todaySessions: parseInt(todaySessions),
                monthlyRevenue: parseFloat(monthlyRevenue)
            }
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message });
    }
});

app.get('/api/admin/trainer-schedule', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [schedule] = await pool.execute(`
            SELECT 
                ts.*,
                u.name as trainer_name,
                t.specialization
            FROM trainer_schedule ts
            JOIN trainers t ON ts.trainer_id = t.id
            JOIN users u ON t.user_id = u.id
            WHERE ts.slot_type = 'personal'
            ORDER BY 
                FIELD(ts.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
                ts.start_time
        `);
        
        res.json({ success: true, schedule });
    } catch (error) {
        console.error('Ошибка получения расписания тренеров:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.post('/api/admin/trainer-schedule', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const adminId = req.user.userId;
        const { trainer_id, day_of_week, start_time, end_time, max_slots = 1 } = req.body;

        if (!trainer_id || !day_of_week || !start_time || !end_time) {
            return res.status(400).json({ 
                success: false, 
                error: 'Все поля обязательны для заполнения' 
            });
        }

        const start = new Date(`2000-01-01T${start_time}`);
        const end = new Date(`2000-01-01T${end_time}`);
        const durationHours = (end - start) / (1000 * 60 * 60);
        
        if (durationHours < 5) {
            return res.status(400).json({ 
                success: false, 
                error: 'Продолжительность тренировки должна быть не менее 5 часов' 
            });
        }

        const [overlapping] = await pool.execute(`
            SELECT id FROM trainer_schedule 
            WHERE trainer_id = ? AND day_of_week = ? 
            AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
        `, [trainer_id, day_of_week, start_time, start_time, end_time, end_time]);

        if (overlapping.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Время пересекается с существующим слотом тренера' 
            });
        }

        const [result] = await pool.execute(
            'INSERT INTO trainer_schedule (trainer_id, day_of_week, start_time, end_time, slot_type, max_slots, created_by) VALUES (?, ?, ?, ?, "personal", ?, ?)',
            [trainer_id, day_of_week, start_time, end_time, max_slots, adminId]
        );

        res.json({ 
            success: true, 
            message: 'Персональный слот расписания создан',
            scheduleId: result.insertId 
        });
    } catch (error) {
        console.error('Ошибка создания слота расписания:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера: ' + error.message 
        });
    }
});

app.put('/api/admin/trainer-schedule/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const scheduleId = req.params.id;
        const { trainer_id, day_of_week, start_time, end_time, max_slots } = req.body;

        const [schedule] = await pool.execute(
            'SELECT id FROM trainer_schedule WHERE id = ? AND slot_type = "personal"',
            [scheduleId]
        );

        if (schedule.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Персональный слот расписания не найден' 
            });
        }

        const start = new Date(`2000-01-01T${start_time}`);
        const end = new Date(`2000-01-01T${end_time}`);
        const durationHours = (end - start) / (1000 * 60 * 60);
        
        if (durationHours < 5) {
            return res.status(400).json({ 
                success: false, 
                error: 'Продолжительность тренировки должна быть не менее 5 часов' 
            });
        }

        const [overlapping] = await pool.execute(`
            SELECT id FROM trainer_schedule 
            WHERE trainer_id = ? AND day_of_week = ? AND id != ? 
            AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
        `, [trainer_id, day_of_week, scheduleId, start_time, start_time, end_time, end_time]);

        if (overlapping.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Время пересекается с другим слотом тренера' 
            });
        }

        const [result] = await pool.execute(
            'UPDATE trainer_schedule SET trainer_id = ?, day_of_week = ?, start_time = ?, end_time = ?, max_slots = ? WHERE id = ?',
            [trainer_id, day_of_week, start_time, end_time, max_slots, scheduleId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Слот не найден' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Персональный слот расписания обновлен'
        });
    } catch (error) {
        console.error('Ошибка обновления слота расписания:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера: ' + error.message 
        });
    }
});

app.delete('/api/admin/trainer-schedule/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const scheduleId = req.params.id;

        const [schedule] = await pool.execute(
            'SELECT id FROM trainer_schedule WHERE id = ?',
            [scheduleId]
        );

        if (schedule.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Слот не найден' 
            });
        }

        await pool.execute('DELETE FROM trainer_schedule WHERE id = ?', [scheduleId]);

        res.json({ 
            success: true, 
            message: 'Слот удален' 
        });
    } catch (error) {
        console.error('Ошибка удаления слота:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера' 
        });
    }
});

app.get('/api/admin/available-trainers', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { date, time } = req.query;
        
        const [trainers] = await pool.execute(`
            SELECT t.id, u.name, t.specialization
            FROM trainers t
            JOIN users u ON t.user_id = u.id
            WHERE t.is_active = TRUE
            AND t.id NOT IN (
                SELECT trainer_id FROM trainer_schedule 
                WHERE day_of_week = ? AND start_time = ? AND is_active = TRUE
            )
        `, [getDayOfWeek(date), time]);
        
        res.json({ success: true, trainers });
    } catch (error) {
        console.error('Ошибка получения тренеров:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/trainer/schedule', authenticateToken, requireRole('trainer'), async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [trainerRows] = await pool.execute(`
            SELECT id, user_id FROM trainers WHERE user_id = ?
        `, [userId]);
        
        if (trainerRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Тренер не найден' });
        }
        
        const trainerId = trainerRows[0].id;
        
        const [schedule] = await pool.execute(`
            SELECT * 
            FROM trainer_schedule 
            WHERE trainer_id = ?
        `, [trainerId]);
        
        res.json({ success: true, schedule });
    } catch (error) {
        console.error('Ошибка получения расписания:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/group-sessions-list', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [sessions] = await pool.execute(`
            SELECT id, name, time, duration, days 
            FROM group_sessions 
            WHERE is_active = TRUE
            ORDER BY name
        `);
        
        res.json({ success: true, sessions });
    } catch (error) {
        console.error('Ошибка получения групповых занятий:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/profile', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }

        res.json({ success: true, user: users[0] });
    } catch (error) {
        console.error('Ошибка получения профиля админа:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.delete('/api/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const userId = req.params.id;

        const [users] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
        
        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }

        await connection.execute('DELETE FROM bookings WHERE user_id = ?', [userId]);
        await connection.execute('DELETE FROM personal_bookings WHERE user_id = ?', [userId]);
        await connection.execute('DELETE FROM reviews WHERE user_id = ?', [userId]);
        await connection.execute('DELETE FROM user_subscriptions WHERE user_id = ?', [userId]);

        try {
            const [scheduleResult] = await connection.execute('DELETE FROM trainer_schedule WHERE trainer_id IN (SELECT id FROM trainers WHERE user_id = ?)', [userId]);
        } catch (scheduleError) {
        }

        try {
            const [trainerRecords] = await connection.execute('SELECT id FROM trainers WHERE user_id = ?', [userId]);
            if (trainerRecords.length > 0) {
                const trainerId = trainerRecords[0].id;
                
                await connection.execute('DELETE FROM trainer_schedule WHERE trainer_id = ?', [trainerId]);
                await connection.execute('DELETE FROM group_sessions WHERE trainer_id = ?', [trainerId]);
                await connection.execute('DELETE FROM trainers WHERE id = ?', [trainerId]);
            }
        } catch (trainerError) {
        }

        const [userResult] = await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

        await connection.commit();

        if (userResult.affectedRows > 0) {
            res.json({ 
                success: true, 
                message: 'Пользователь успешно удален' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Не удалось удалить пользователя' 
            });
        }

    } catch (error) {
        await connection.rollback();
        console.error('Ошибка удаления пользователя:', error);
        
        res.status(500).json({ 
            success: false, 
            error: `Ошибка сервера: ${error.message}`
        });
    } finally {
        connection.release();
    }
});

app.put('/api/admin/profile', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name, email, phone, password } = req.body;

        if (email) {
            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, userId]
            );
            
            if (existingUsers.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Пользователь с таким email уже существует' 
                });
            }
        }

        let updateQuery = 'UPDATE users SET name = ?, email = ?, phone = ?';
        let queryParams = [name, email, phone];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            queryParams.push(hashedPassword);
        }

        updateQuery += ' WHERE id = ?';
        queryParams.push(userId);

        const [result] = await pool.execute(updateQuery, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Пользователь не найден' });
        }

        const [users] = await pool.execute(
            'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
            [userId]
        );

        res.json({ 
            success: true, 
            message: 'Профиль успешно обновлен',
            user: users[0]
        });
    } catch (error) {
        console.error('Ошибка обновления профиля админа:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.listen(PORT, async () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`API доступно: http://localhost:${PORT}/api`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    
    await testDB();
});