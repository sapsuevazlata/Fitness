class TrainerManager {
    constructor() {
        console.log('TrainerManager создан');
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
        console.log('🔧 Инициализация кабинета тренера...');
        this.loadSchedule();
        this.loadGroupSessions();
        this.loadClients();
    }

    async loadSchedule() {
        try {
            console.log('Загружаем расписание...');
            
            const response = await fetch(this.API_BASE_URL + '/trainer/schedule', {
                headers: this.getAuthHeaders()
            });
            
            const data = await response.json();
            console.log('Данные расписания:', data);
            
            if (data.success) {
                console.log('Расписание загружено, элементов:', data.schedule?.length);
                this.renderSchedule(data.schedule);
            } else {
                console.error('Ошибка в данных:', data.error);
                this.showNotification('Ошибка загрузки расписания', 'error');
            }
        } catch (error) {
            console.error('Ошибка загрузки расписания:', error);
            this.showNotification('Ошибка загрузки расписания', 'error');
        }
    }

    async loadGroupSessions() {
        try {
            console.log('🔄 Загружаем групповые занятия...');
            
            const response = await fetch(this.API_BASE_URL + '/trainer/group-sessions', {
                headers: this.getAuthHeaders()
            });
            
            const data = await response.json();
            console.log('Получены group_sessions:', data);
            
            if (data.success) {
                this.renderGroupSessionsInSchedule(data.sessions);
                this.renderGroupSessionsInClasses(data.sessions);
            } else {
                console.error('Ошибка загрузки group_sessions:', data.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки group_sessions:', error);
        }
    }

    renderGroupSessionsInSchedule(sessions) {
        const container = document.getElementById('trainer-group-sessions');
        if (!container) {
            console.error('Контейнер trainer-group-sessions не найден');
            return;
        }

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="empty-state">
                        <i class="fas fa-users fa-2x"></i>
                        <p>У вас пока нет групповых занятий</p>
                        <small>Групповые занятия будут отображаться здесь</small>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = sessions.map(session => this.renderGroupSessionCard(session)).join('');
    }

    renderGroupSessionsInClasses(sessions) {
        const container = document.getElementById('trainer-group-classes-list');
        if (!container) {
            console.error('Элемент trainer-group-classes-list не найден!');
            return;
        }

        if (!sessions || sessions.length === 0) {
            container.innerHTML = '<p>У вас нет запланированных групповых занятий</p>';
            return;
        }

        container.innerHTML = sessions.map(session => `
            <div class="group-session-card">
                <h4>${session.name || 'Групповое занятие'}</h4>
                <p><strong>Описание:</strong> ${session.description || 'Нет описания'}</p>
                <p><strong>Дни:</strong> ${session.days || 'Не указаны'}</p>
                <p><strong>Время:</strong> ${session.time || 'Не указано'}</p>
                <p><strong>Длительность:</strong> ${session.duration || 0} мин.</p>
                <p><strong>Участников:</strong> ${session.current_participants || 0}/${session.max_participants || 0}</p>
                <p><strong>Статус:</strong> ${session.is_active ? 'Активно' : 'Неактивно'}</p>
            </div>
        `).join('');
    }

    renderGroupSessionCard(session) {
        const days = session.days ? session.days.split(',') : [];
        const daysText = days.map(day => this.getDayText(day)).join(', ');
        const availableSpots = session.max_participants - (session.current_participants || 0);
        const isFull = availableSpots <= 0;
        const statusClass = session.is_active ? 'active' : 'inactive';
        
        return `
            <div class="card group-session-card ${statusClass}" data-session-id="${session.id}">
                <div class="session-header">
                    <div class="session-info">
                        <h4>${session.name || 'Групповое занятие'}</h4>
                        <span class="session-status ${isFull ? 'full' : 'available'}">
                            ${isFull ? '🔴 Мест нет' : '🟢 Доступно'}
                        </span>
                    </div>
                    <span class="session-badge ${statusClass}">
                        ${session.is_active ? 'Активно' : 'Неактивно'}
                    </span>
                </div>
                
                <div class="session-description">
                    ${session.description || 'Групповое занятие под вашим руководством.'}
                </div>
                
                <div class="session-details">
                    <div class="detail-row">
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>Время: ${session.time || '10:00'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-stopwatch"></i>
                            <span>Длительность: ${session.duration || 60} мин.</span>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <span>Дни: ${daysText || 'Пн, Ср, Пт'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <span>Записано: ${session.current_participants || 0}/${session.max_participants || 10}</span>
                        </div>
                    </div>
                </div>

                <div class="session-stats">
                    <div class="stat-item">
                        <span class="stat-label">Свободных мест:</span>
                        <span class="stat-value ${isFull ? 'full' : ''}">${availableSpots}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Заполненность:</span>
                        <span class="stat-value">${Math.round(((session.current_participants || 0) / (session.max_participants || 10)) * 100)}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderSchedule(schedule) {
        const container = document.getElementById('trainer-schedule');
        if (!container) return;

        if (!schedule || schedule.length === 0) {
            container.innerHTML = `
                <div class="empty-schedule">
                    <p>Ваше расписание еще не настроено администратором</p>
                    <p class="text-muted">Обратитесь к администратору для настройки расписания</p>
                </div>
            `;
            return;
        }

        const days = {
            monday: { name: 'Понедельник', slots: [] },
            tuesday: { name: 'Вторник', slots: [] },
            wednesday: { name: 'Среда', slots: [] },
            thursday: { name: 'Четверг', slots: [] },
            friday: { name: 'Пятница', slots: [] },
            saturday: { name: 'Суббота', slots: [] },
            sunday: { name: 'Воскресенье', slots: [] }
        };

        schedule.forEach(slot => {
            if (days[slot.day_of_week]) {
                days[slot.day_of_week].slots.push(slot);
            }
        });

        container.innerHTML = `
            <div class="schedule-header">
                <h3>Мое расписание</h3>
            </div>
            <div class="schedule-grid">
                ${Object.values(days).map(day => `
                    <div class="schedule-day ${day.slots.length > 0 ? 'has-slots' : 'no-slots'}">
                        <h4>${day.name}</h4>
                        ${day.slots.length > 0 ? 
                            day.slots.map(slot => this.renderScheduleSlot(slot)).join('') :
                            '<p class="no-slots-text">Нет запланированных занятий</p>'
                        }
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderScheduleSlot(slot) {
        const startTime = slot.start_time.substring(0, 5);
        const endTime = slot.end_time.substring(0, 5);
        const availableSlots = slot.max_slots - (slot.booked_slots || 0);
        const isPersonal = slot.slot_type === 'personal';
        
        return `
            <div class="schedule-slot ${slot.is_active ? 'active' : 'inactive'} ${isPersonal ? 'personal' : 'group'}">
                <div class="slot-time">${startTime} - ${endTime}</div>
                <div class="slot-type">${isPersonal ? 'Персональная тренировка' : 'Групповое занятие'}</div>
                <div class="slot-info">
                    <span class="slots-count">${availableSlots}/${slot.max_slots} мест</span>
                    <span class="slot-status">${slot.is_active ? 'Активен' : 'Неактивен'}</span>
                </div>
            </div>
        `;
    }

    getDayText(day) {
        const daysMap = {
            'monday': 'Пн',
            'tuesday': 'Вт', 
            'wednesday': 'Ср',
            'thursday': 'Чт',
            'friday': 'Пт',
            'saturday': 'Сб',
            'sunday': 'Вс'
        };
        return daysMap[day.toLowerCase()] || day;
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
            background: ${this.getNotificationColor(type)};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            max-width: 400px;
            word-wrap: break-word;
            transition: all 0.3s ease;
            transform: translateX(100%);
            opacity: 0;
        `;
        
        const icon = this.getNotificationIcon(type);
        if (icon) {
            notification.innerHTML = `
                <i class="${icon}" style="margin-right: 8px;"></i>
                ${message}
            `;
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 100);
        
        const autoRemoveTimeout = setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(100%)';
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
        
        notification.addEventListener('click', () => {
            clearTimeout(autoRemoveTimeout);
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }

    getNotificationColor(type) {
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };
        return colors[type] || colors.info;
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    async loadClients() {
        console.log('Загрузка клиентов...');
    }
}

window.trainerManager = new TrainerManager();