// Fondo de la pantalla inicial: se desvanece al hacer scroll
function updateHomeBgOpacity() {
    const homeBg = document.querySelector('#home .home-bg');
    if (!homeBg) return;
    const scrollY = window.scrollY;
    const fadeDistance = 350;
    const baseOpacity = 0.8; // transparencia base del fondo
    const factor = Math.max(0, 1 - scrollY / fadeDistance);
    const opacity = baseOpacity * factor;
    homeBg.style.opacity = String(opacity);
}

// Flores por sección: aparecen al entrar en vista y desaparecen al salir
function initSectionFlowersVisibility() {
    const sections = document.querySelectorAll('#our-story, #quiz, #info, #dresscode, #regalos, #confirmar-asistencia');
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const flowers = entry.target.querySelector('.section-flowers');
                if (flowers) {
                    flowers.classList.toggle('is-visible', entry.isIntersecting);
                }
            });
        },
        { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );
    sections.forEach((section) => observer.observe(section));
}

window.addEventListener('scroll', updateHomeBgOpacity);
window.addEventListener('load', () => {
    updateHomeBgOpacity();
    initSectionFlowersVisibility();
});

const quizData = [
    { question: '¿A qué concierto o evento fuimos juntos por primera vez?', answer: 'Bad Bunny 2022' },
    { question: '¿Cuál es nuestra comida favorita?', answer: 'Pasta (La de verdad)' },
    { question: '¿Quién es más probable que se quede dormido viendo una película?', answer: 'Gaby' },
    { question: '¿Cuál es el destino de nuestros sueños para la luna de miel?', answer: 'Italia' },
    { question: '¿Tenemos alguna mascota?', answer: 'Muffin Cecilio y Coco Francisco' },
    { question: '¿Cuál es nuestra serie favorita?', answer: 'Friends (Si pensaste en Betty tambien' },
    { question: '¿El regalo más memorable?', answer: 'Un viaje sorpresa' },
    { question: '¿Nuestra canción?', answer: '"Innerbloom" de Rufus du Sol' },
    { question: '¿Qué nos gusta hacer los domingos?', answer: 'Ver una película en casa y compartir con nuestra familia' },
    { question: '¿El plan de futuro que más nos emociona?', answer: 'Construir nuestra casa' }
];

const quizContainer = document.querySelector('.quiz-container');

quizData.forEach(data => {
    const card = document.createElement('div');
    card.classList.add('quiz-card');
    card.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <p>${data.question}</p>
            </div>
            <div class="card-back">
                <p>${data.answer}</p>
            </div>
        </div>
    `;
    quizContainer.appendChild(card);
});


