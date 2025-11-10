class FitnessApp {
    constructor() {
        this.currentUser = null;
    }

    init() {
        this.bindEvents();
        this.showSection('home');
        this.checkAuthState();
    }

    bindEvents() {
        console.log('🔧 Привязка событий...');
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('data-section');
                this.showSection(section);
                
                document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
                e.target.classList.add('active');

                if (section === 'trainers') {
                    console.log('Переход на секцию тренеров, загружаем данные...');
                    if (window.catalogManager) {
                        window.catalogManager.loadTrainers();
                    } else {
                        console.error('catalogManager не найден');
                    }
                } else if (section === 'group-classes') {
                    console.log('Переход на секцию групповых занятий');
                }
            });
        });

        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        
        console.log('Кнопка Войти:', loginBtn);
        console.log('Кнопка Регистрация:', registerBtn);
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                console.log('Кнопка Войти нажата в app.js');
                this.openModal('login');
            });
        } else {
            console.log('Кнопка Войти не найдена в app.js');
        }
        
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                console.log('Кнопка Регистрация нажата в app.js');
                this.openModal('register');
            });
        }

        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.closeModals());
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });

        const goToRegister = document.getElementById('go-to-register');
        const goToLogin = document.getElementById('go-to-login');
        
        if (goToRegister) {
            goToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModals();
                this.openModal('register');
            });
        }
        
        if (goToLogin) {
            goToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModals();
                this.openModal('login');
            });
        }
    }

    showSection(sectionName) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        const activeSection = document.getElementById(`${sectionName}-section`);
        if (activeSection) {
            activeSection.classList.add('active');
        }

        this.loadSectionData(sectionName);
    }

    loadSectionData(sectionName) {
        switch(sectionName) {
            case 'group-classes':
                if (typeof loadGroupClasses === 'function') {
                    loadGroupClasses();
                }
                break;
            case 'trainers':
                if (typeof loadTrainers === 'function') {
                    loadTrainers();
                }
                break;
            case 'schedule':
                if (typeof loadSchedule === 'function') {
                    loadSchedule();
                }
                break;
        }
    }

    openModal(modalType) {
        console.log('🎯 openModal вызван для:', modalType);
        this.closeModals();
        const modal = document.getElementById(`${modalType}-modal`);
        if (modal) {
            modal.style.display = 'block';
            console.log('Модальное окно открыто:', modal);
        } else {
            console.log('Модальное окно не найдено:', `${modalType}-modal`);
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    checkAuthState() {
        const userData = localStorage.getItem('fitnessUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUIForAuth();
            this.redirectIfAuthenticated();
        }
    }

    updateUIForAuth() {
        const authButtons = document.querySelector('.auth-buttons');
        if (this.currentUser) {
            authButtons.innerHTML = `
                <div class="user-menu">
                    <span>${this.currentUser.name}</span>
                    <button id="logout-btn" class="btn btn-outline">Выйти</button>
                </div>
            `;
            document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        }
    }

    redirectIfAuthenticated() {
        if (this.currentUser) {
            const currentPage = window.location.pathname;
            if (currentPage.endsWith('index.html') || currentPage === '/') {
                setTimeout(() => {
                    this.redirectByRole(this.currentUser);
                }, 1000);
            }
            this.protectPages();
        }
    }

    protectPages() {
        const currentPage = window.location.pathname;
        
        if (currentPage.includes('admin-dashboard') && this.currentUser.role !== 'admin') {
            this.redirectByRole(this.currentUser);
            return;
        }
        
        if (currentPage.includes('trainer-dashboard') && this.currentUser.role !== 'trainer') {
            this.redirectByRole(this.currentUser);
            return;
        }
        
        if (currentPage.includes('client-profile') && this.currentUser.role !== 'client') {
            this.redirectByRole(this.currentUser);
            return;
        }
    }

    redirectByRole(user) {
        console.log('🔄 Перенаправление пользователя:', user);
        
        switch(user.role) {
            case 'admin':
                if (!window.location.pathname.includes('admin-dashboard')) {
                    window.location.href = 'admin-dashboard.html';
                }
                break;
            case 'trainer':
                if (!window.location.pathname.includes('trainer-dashboard')) {
                    window.location.href = 'trainer-dashboard.html';
                }
                break;
            case 'client':
            default:
                if (!window.location.pathname.includes('client-profile')) {
                    window.location.href = 'client-profile.html';
                }
                break;
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('fitnessUser');
        this.updateUIForAuth();
        this.showSection('home');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Инициализация FitnessApp...');
    window.fitnessApp = new FitnessApp();
    window.fitnessApp.init();
});