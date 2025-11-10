class AdminSettingsManager {
    constructor() {
        this.token = Auth.getToken();
        this.API_BASE_URL = 'http://localhost:3000/api';
        this.currentUser = Auth.getCurrentUser();
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    init() {
        console.log('🔧 Инициализация управления настройками...');
        this.bindEvents();
        this.loadAdminProfile();
    }

    bindEvents() {
        const profileForm = document.getElementById('admin-profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateAdminProfile(profileForm);
            });
        }
    }

    async loadAdminProfile() {
        try {
            console.log('Загружаем данные админа...');
            
            if (this.currentUser) {
                this.renderAdminProfile(this.currentUser);
            }
            
            const response = await fetch(this.API_BASE_URL + '/admin/profile', {
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.renderAdminProfile(data.user);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля админа:', error);
        }
    }

    renderAdminProfile(user) {
        document.getElementById('admin-profile-name').value = user.name || '';
        document.getElementById('admin-profile-email').value = user.email || '';
        document.getElementById('admin-profile-phone').value = user.phone || '';
        
        document.getElementById('admin-registration-date').textContent = 
            user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Не указана';
        document.getElementById('admin-user-id').textContent = user.id || 'Не указан';
    }

    async updateAdminProfile(form) {
        console.log('Обновляем профиль админа...');
        
        const formData = new FormData(form);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');
        
        if (password && password !== confirmPassword) {
            this.showNotification('Пароли не совпадают', 'error');
            return;
        }

        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone')
        };

        if (password) {
            data.password = password;
        }

        console.log('Данные для обновления:', data);

        try {
            const response = await fetch(this.API_BASE_URL + '/admin/profile', {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('Ответ сервера:', result);
            
            if (result.success) {
                this.showNotification('Профиль успешно обновлен', 'success');
                
                if (result.user) {
                    localStorage.setItem('fitnessUser', JSON.stringify(result.user));
                    this.currentUser = result.user;
                    
                    const userNameElement = document.getElementById('userName');
                    if (userNameElement) {
                        userNameElement.textContent = result.user.name;
                    }
                }
            } else {
                this.showNotification(result.error || 'Ошибка обновления', 'error');
            }
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            this.showNotification('Ошибка обновления: ' + error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

window.adminSettingsManager = new AdminSettingsManager();