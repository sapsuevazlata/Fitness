class CatalogManager {
    constructor() {
        this.API_BASE_URL = 'http://localhost:3000/api';
        this.token = Auth.getToken();
        this.initFilters();
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    init() {
        this.loadTrainers();
        this.loadGroupSessions();
        this.loadSubscriptions();
    }

    async loadTrainers() {
        try {
            console.log('🔄 Загружаем список тренеров...');
            
            const response = await fetch(this.API_BASE_URL + '/public/trainers');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Получены данные тренеров:', data);
            
            if (data.success) {
                this.renderTrainers(data.trainers);
            } else {
                this.showError('Ошибка загрузки тренеров');
            }
        } catch (error) {
            console.error('Ошибка загрузки тренеров:', error);
            this.showError('Не удалось загрузить список тренеров');
        }
    }

    renderTrainers(trainers) {
        const container = document.getElementById('trainers-list');
        if (!container) {
            console.error('Контейнер тренеров не найден');
            return;
        }

        if (!trainers || trainers.length === 0) {
            container.innerHTML = '<div class="loading">Тренеры не найдены</div>';
            return;
        }

        container.innerHTML = trainers.map(trainer => this.renderTrainerCard(trainer)).join('');
    }

    renderTrainerCard(trainer) {
        const firstLetter = trainer.name ? trainer.name.charAt(0).toUpperCase() : 'T';
        const statusClass = trainer.is_active ? 'status-active' : 'status-inactive';
        const statusText = trainer.is_active ? 'Активен' : 'Неактивен';
        const rating = trainer.rating || 0;
        const ratingStars = this.renderRatingStars(rating);
        
        return `
            <div class="trainer-card" data-trainer-id="${trainer.id}">
                <div class="trainer-header">
                    <div class="trainer-avatar">${firstLetter}</div>
                    <div class="trainer-info">
                        <h3>${trainer.name || 'Тренер'}</h3>
                        <div class="trainer-rating">${ratingStars}</div>
                    </div>
                </div>
                
                <div class="trainer-specialization">${trainer.specialization || 'Фитнес'}</div>
                
                <div class="trainer-experience">
                    <i class="fas fa-award"></i> Опыт: ${trainer.experience || 'Не указан'}
                </div>
                
                <div class="trainer-bio">
                    ${trainer.bio || 'Профессиональный тренер с индивидуальным подходом к каждому клиенту.'}
                </div>
                
                <div class="trainer-footer">
                    <span class="trainer-status ${statusClass}">
                        <i class="fas fa-circle"></i> ${statusText}
                    </span>
                </div>
            </div>
        `;
    }

    renderRatingStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars + ` <span style="color: #666; font-size: 12px;">(${rating})</span>`;
    }

    showError(message) {
        const container = document.getElementById('trainers-list');
        if (container) {
            container.innerHTML = `<div class="loading error">${message}</div>`;
        }
    }

    async loadSubscriptions() {
        try {
            console.log('Загружаем абонементы...');
            
            const response = await fetch(this.API_BASE_URL + '/public/subscriptions');
            const data = await response.json();
            
            if (data.success) {
                this.renderSubscriptions(data.subscriptions);
            } else {
                this.showSubscriptionsError('Ошибка загрузки абонементов');
            }
        } catch (error) {
            console.error('Ошибка загрузки абонементов:', error);
            this.showSubscriptionsError('Не удалось загрузить список абонементов');
        }
    }

    renderSubscriptions(subscriptions) {
        const container = document.getElementById('subscriptions-list');
        if (!container) return;

        if (!subscriptions || subscriptions.length === 0) {
            container.innerHTML = '<div class="loading">Абонементы не найдены</div>';
            return;
        }

        container.innerHTML = subscriptions.map(subscription => {
            const isActive = Boolean(subscription.is_active);
            
            return `
                <div class="card subscription-card">
                    <div class="card-content">
                        <div class="subscription-header">
                            <h3>${subscription.name}</h3>
                            <span class="subscription-type ${subscription.type}">
                                ${this.getTypeText(subscription.type)}
                            </span>
                        </div>
                        
                        <p class="subscription-description">${subscription.description}</p>
                        
                        <div class="subscription-details">
                            <div class="detail-item">
                                <i class="fas fa-ruble-sign"></i>
                                <span>${subscription.price} ₽</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-ticket-alt"></i>
                                <span>${subscription.visits_count} посещений</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-calendar"></i>
                                <span>${subscription.duration_days} дней</span>
                            </div>
                        </div>

                        <div class="subscription-status ${isActive ? 'active' : 'inactive'}">
                            ${isActive ? '✅ Активен' : '❌ Неактивен'}
                        </div>

                        <div class="card-actions">
                            <button class="btn btn-primary" onclick="catalogManager.handleSubscriptionAction(${subscription.id})">
                                <i class="fas fa-shopping-cart"></i> Приобрести
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTypeText(type) {
        const types = {
            'group': 'Групповые',
            'gym': 'Зал', 
            'combo': 'Все включено',
            'standard': 'Стандартный',
            'premium': 'Премиум',
            'unlimited': 'Безлимитный'
        };
        return types[type] || type;
    }

    handleSubscriptionAction(subscriptionId) {
        if (!Auth.getToken()) {
            alert('Пожалуйста, войдите в систему для приобретения абонемента');
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) loginBtn.click();
            return;
        }
        
        console.log('🛒 Покупка абонемента:', subscriptionId);
        alert('Функция покупки абонемента будет реализована позже');
    }

    showSubscriptionsError(message) {
        const container = document.getElementById('subscriptions-list');
        if (container) {
            container.innerHTML = `<div class="loading error">${message}</div>`;
        }
    }

    async loadGroupSessions() {
        try {
            console.log('Загружаем групповые занятия...');
            
            const response = await fetch(this.API_BASE_URL + '/public/group-sessions');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Получены данные занятий:', data);
            
            if (data.success) {
                this.renderGroupSessions(data.sessions);
            } else {
                this.showGroupSessionsError('Ошибка загрузки занятий');
            }
        } catch (error) {
            console.error('Ошибка загрузки занятий:', error);
            this.showGroupSessionsError('Не удалось загрузить список занятий');
        }
    }

    renderGroupSessions(sessions) {
        const container = document.getElementById('group-classes-list');
        if (!container) {
            console.error('Контейнер group-classes-list не найден');
            return;
        }

        if (!sessions || sessions.length === 0) {
            container.innerHTML = '<div class="loading">Занятий не найдено</div>';
            return;
        }

        container.innerHTML = sessions.map(session => this.renderSessionCard(session)).join('');
    }

    renderSessionCard(session) {
        const days = session.days ? session.days.split(',') : [];
        const daysText = days.map(day => this.getDayText(day)).join(', ');
        const availableSpots = session.max_participants - (session.current_participants || 0);
        const isFull = availableSpots <= 0;
        
        return `
            <div class="session-card" data-session-id="${session.id}">
                <div class="session-header">
                    <h3>${session.name || 'Групповое занятие'}</h3>
                    <span class="session-status ${isFull ? 'full' : 'available'}">
                        ${isFull ? 'Мест нет' : `${availableSpots} мест`}
                    </span>
                </div>
                
                <div class="session-description">
                    ${session.description || 'Интенсивное групповое занятие под руководством опытного тренера.'}
                </div>
                
                <div class="session-details">
                    <div class="detail-item">
                        <i class="fas fa-user-tie"></i>
                        <span>${session.trainer_name || 'Тренер'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <span>${session.time || '10:00'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>${daysText || 'Пн, Ср, Пт'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-stopwatch"></i>
                        <span>${session.duration || 60} мин.</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-users"></i>
                        <span>${session.max_participants || 10} макс.</span>
                    </div>
                </div>

                <div class="session-actions">
                    <button class="btn btn-primary ${isFull ? 'disabled' : ''}" 
                            onclick="catalogManager.bookSession(${session.id})"
                            ${isFull ? 'disabled' : ''}>
                        <i class="fas fa-bookmark"></i> 
                        ${isFull ? 'Мест нет' : 'Записаться'}
                    </button>
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

    async bookSession(sessionId) {
        if (!this.token) {
            alert('Пожалуйста, войдите в систему для записи на занятия');
            return;
        }
        
        try {
            console.log('📝 Запись на занятие:', sessionId);
            alert('Функция записи на занятие будет реализована позже');
        } catch (error) {
            console.error('Ошибка записи:', error);
            alert('Ошибка при записи на занятие');
        }
    }

    showGroupSessionsError(message) {
        const container = document.getElementById('group-classes-list');
        if (container) {
            container.innerHTML = `<div class="loading error">${message}</div>`;
        }
    }
    
    initFilters() {
        const experienceFilter = document.getElementById('experience-filter');
        const specializationFilter = document.getElementById('specialization-filter');
        const typeFilter = document.getElementById('type-filter');
        const sortPrice = document.getElementById('sort-price');
        
        if (experienceFilter) {
            experienceFilter.addEventListener('change', () => this.filterTrainers());
        }
        
        if (specializationFilter) {
            specializationFilter.addEventListener('change', () => this.filterTrainers());
        }

        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.filterSessions());
        }

        if (sortPrice) {
            sortPrice.addEventListener('change', () => this.filterSessions());
        }
    }

    filterTrainers() {
        console.log('Фильтрация тренеров...');
    }

    filterSessions() {
        console.log('Фильтрация занятий...');
    }
}

window.catalogManager = new CatalogManager();

document.addEventListener('DOMContentLoaded', function() {
    window.catalogManager.init();
});