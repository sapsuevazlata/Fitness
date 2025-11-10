const API_BASE_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Страница загружена! Ищем формы...');
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('register-form');
    
    console.log('Форма логина:', loginForm);
    console.log('Форма регистрации:', registerForm);
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Обработчик логина привязан');
    } else {
        console.log('Форма логина не найдена!');
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('Обработчик регистрации привязан');
    } else {
        console.log('Форма регистрации не найдена!');
    }
});

function redirectByRole(user) {
    if (!user || !user.role) {
        alert('Ошибка: данные пользователя не получены');
        return;
    }
    
    switch(user.role) {
        case 'admin':
            window.location.href = 'admin-dashboard.html';
            break;
        case 'trainer':
            window.location.href = 'trainer-dashboard.html';
            break;
        case 'client':
        default:
            window.location.href = 'client-profile.html';
            break;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
        const response = await fetch(API_BASE_URL + '/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('fitnessUser', JSON.stringify(data.user));
            localStorage.setItem('fitnessToken', data.token);
            
            const modal = document.getElementById('login-modal');
            if (modal) modal.style.display = 'none';
            
            redirectByRole(data.user);
            
        } else {
            alert('Ошибка: ' + data.error);
        }
    } catch (error) {
        console.error('Ошибка сети:', error);
        alert('Ошибка соединения с сервером');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (!name || name.trim() === '') {
        alert('Пожалуйста, заполните имя');
        return;
    }
    if (!email || email.trim() === '') {
        alert('Пожалуйста, заполните email');
        return;
    }
    if (!password || password.trim() === '') {
        alert('Пожалуйста, заполните пароль');
        return;
    }
    if (!confirmPassword || confirmPassword.trim() === '') {
        alert('Пожалуйста, подтвердите пароль');
        return;
    }

    if (password !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
    }

    try {
        const response = await fetch(API_BASE_URL + '/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                name: name.trim(),
                email: email.trim(), 
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Регистрация прошла успешно!');
            
            localStorage.setItem('fitnessUser', JSON.stringify(data.user));
            localStorage.setItem('fitnessToken', data.token);
            
            const modal = document.getElementById('register-modal');
            if (modal) modal.style.display = 'none';
            
            redirectByRole(data.user);
            
        } else {
            alert('Ошибка: ' + data.error);
        }
    } catch (error) {
        console.error('Ошибка сети:', error);
        alert('Ошибка соединения с сервером');
    }
}

class Auth {
    static getCurrentUser() {
        const userData = localStorage.getItem('fitnessUser');
        return userData ? JSON.parse(userData) : null;
    }
    
    static logout() {
        console.log('🔒 Выход из системы...');
        
        localStorage.removeItem('fitnessUser');
        localStorage.removeItem('fitnessToken');
        
        console.log('Данные очищены');
        
        window.location.replace('index.html');
    }
    
    static getToken() {
        return localStorage.getItem('fitnessToken');
    }
    
    static isAuthenticated() {
        return !!localStorage.getItem('fitnessUser');
    }
}

function logout() {
    console.log('Кнопка выхода нажата!');
    Auth.logout();
    return false;
}