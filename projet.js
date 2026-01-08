// ============================================ // CONSTANTE API // ============================================
const RESTCOUNTRIES_ALL = 'https://restcountries.com/v3.1/all?fields=name,capital,population,region,subregion,languages,currencies,flags,area,timezones';

// ============================================ // VARIABLES GLOBALES // ============================================
let allCountriesData = [];
let debounceTimer; // pour debounce recherche

// ============================================ // FONCTIONS UTILITAIRES // ============================================
function generateHeritageInfo(country) {
    return {
        name: country.name?.common || 'Non spécifié',
        capital: country.capital?.[0] || 'Non spécifié',
        population: country.population ? country.population.toLocaleString() : 'Non disponible',
        region: country.region || 'Inconnue',
        subregion: country.subregion || 'Non spécifié',
        languages: country.languages ? Object.values(country.languages).join(', ') : 'Non spécifié',
        currency: country.currencies ? Object.values(country.currencies)[0]?.name || 'Non spécifié' : 'Non spécifié',
        flag: country.flags?.png || '',
        area: country.area ? `${country.area.toLocaleString()} km²` : 'Non disponible',
        timezone: country.timezones?.[0] || 'Non spécifié'
    };
}

// ============================================ // AFFICHAGE DES CARTES PAYS // ============================================
function createCountryCard(country) {
    const info = generateHeritageInfo(country);
    return `
        <div class="col-md-4 mb-4">
            <div class="card country-card h-100">
                <img src="${info.flag}" class="card-img-top" style="height:150px;object-fit:cover">
                <div class="card-body">
                    <h5>${info.name}</h5>
                    <p>🏙️ ${info.capital}</p>
                    <p>👥 ${info.population}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-heritage view-details-btn" data-country="${info.name}">
                        Voir détails
                    </button>
                </div>
            </div>
        </div>`;
}

// ============================================ // CHARGEMENT DES DONNÉES PAYS // ============================================
function loadAllCountries() {
    $.getJSON(RESTCOUNTRIES_ALL)
        .done(data => {
            allCountriesData = data;
            displayCountries(data);
            populateCountriesTable(data);
            updateStatistics();
        })
        .fail(() => {
            $('#countries-container').html('<p class="text-danger">Erreur de chargement</p>');
        });
}

function loadRandomCountries(count) {
    $.getJSON(RESTCOUNTRIES_ALL)
        .done(data => {
            const random = data.sort(() => 0.5 - Math.random()).slice(0, count);
            $('#countries-preview').empty();
            random.forEach(c => $('#countries-preview').append(createCountryCard(c)));
            attachViewDetailsEvents();
        });
}

// ============================================ // AFFICHAGE DES PAYS // ============================================
function displayCountries(countries) {
    const container = $('#countries-container');
    container.empty();

    if (countries.length === 0) {
        container.html('<p class="text-center text-muted">Aucun résultat trouvé.</p>');
        return;
    }

    countries.forEach(country => container.append(createCountryCard(country)));
    attachViewDetailsEvents();
}

// ============================================ // TABLEAU PAYS // ============================================
function populateCountriesTable(countries) {
    const tbody = $('#countries-table-body');
    tbody.empty();

    countries.forEach(country => {
        const info = generateHeritageInfo(country);
        tbody.append(`
            <tr>
                <td>${info.name}</td>
                <td>${info.capital}</td>
                <td>${info.region}</td>
                <td>${info.population}</td>
                <td>${info.languages}</td>
                <td>${info.currency}</td>
            </tr>
        `);
    });

    if (!$.fn.DataTable.isDataTable('#countries-table')) {
        $('#countries-table').DataTable();
    }
}

// ============================================ // STATISTIQUES PAYS // ============================================
function updateStatistics() {
    const totalCountries = allCountriesData.length;
    const totalLanguages = new Set(allCountriesData.flatMap(c => c.languages ? Object.values(c.languages) : [])).size;
    const totalPopulation = allCountriesData.reduce((sum, c) => sum + (c.population || 0), 0);
    const totalCurrencies = new Set(allCountriesData.flatMap(c => c.currencies ? Object.values(c.currencies).map(cur => cur.name) : [])).size;

    $('#total-countries-display').text(totalCountries);
    $('#total-languages-display').text(totalLanguages);
    $('#total-population-display').text((totalPopulation / 1e9).toFixed(1) + ' Md');
    $('#total-currencies-display').text(totalCurrencies);
}

// ============================================ // FILTRAGE PAYS PAR RÉGION // ============================================
function filterByRegion(region) {
    const filtered = region ? allCountriesData.filter(c => c.region === region) : allCountriesData;
    displayCountries(filtered);
    populateCountriesTable(filtered);
}

// ============================================ // RECHERCHE PAYS // ============================================
function searchCountries() {
    const query = $('#country-search').val().toLowerCase();
    if (!allCountriesData || allCountriesData.length === 0) return;

    $('#loading-spinner').show();
    const filtered = allCountriesData.filter(c => {
        const info = generateHeritageInfo(c);
        return info.name.toLowerCase().includes(query) ||
               info.capital.toLowerCase().includes(query) ||
               info.languages.toLowerCase().includes(query);
    });

    displayCountries(filtered);
    populateCountriesTable(filtered);
    $('#loading-spinner').hide();
}

// ============================================ // DÉTAILS PAYS // ============================================
function viewCountryDetails(countryName) {
    $.ajax({
        url: `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true`,
        method: 'GET',
        success: data => showCountryModal(generateHeritageInfo(data[0])),
        error: () => alert('Erreur chargement détails')
    });
}

function showCountryModal(info) {
    $('#countryModal').remove();
    $('body').append(`
        <div class="modal fade" id="countryModal">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-heritage text-white">
                        <h5>${info.name}</h5>
                        <button class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <img src="${info.flag}" class="img-fluid mb-3">
                        <p><strong>Capitale:</strong> ${info.capital}</p>
                        <p><strong>Population:</strong> ${info.population}</p>
                        <p><strong>Langues:</strong> ${info.languages}</p>
                        <p><strong>Monnaie:</strong> ${info.currency}</p>
                        <p><strong>Région:</strong> ${info.region}</p>
                        <p><strong>Sub-région:</strong> ${info.subregion}</p>
                        <p><strong>Superficie:</strong> ${info.area}</p>
                        <p><strong>Fuseau horaire:</strong> ${info.timezone}</p>
                    </div>
                </div>
            </div>
        </div>
    `);
    new bootstrap.Modal(document.getElementById('countryModal')).show();
}

function attachViewDetailsEvents() {
    $('.view-details-btn').off('click').on('click', function () {
        viewCountryDetails($(this).data('country'));
    });
}

// ============================================ // FORMULAIRE CONTACT // ============================================
function validateContactForm(e) {
    e.preventDefault();
    let valid = true;
    $('.is-invalid').removeClass('is-invalid');

    if (!$('#contact-name').val()) { $('#contact-name').addClass('is-invalid'); valid = false; }
    if (!$('#contact-email').val()) { $('#contact-email').addClass('is-invalid'); valid = false; }
    if (valid) simulateFormSubmission();
}

function simulateFormSubmission() {
    $('#contact-form').hide();
    $('#success-message').show();
}

// ============================================ // PATRIMOINE CULTUREL // ============================================
function loadCulturalHeritage() {
    const container = $('#heritage-container');
    const heritageData = [
        { type: 'monument', title: 'Château de Versailles', icon: '🏛️', description: 'Palais royal en France' },
        { type: 'tradition', title: 'Carnaval de Rio', icon: '🎭', description: 'Festival coloré au Brésil' },
        { type: 'art', title: 'Peinture Renaissance', icon: '🎨', description: 'Œuvres en Europe' },
        { type: 'language', title: 'Mandarin', icon: '🗣️', description: 'Langue la plus parlée' }
    ];

    container.empty(); // supprimer loader
    heritageData.forEach(item => {
        container.append(`
            <div class="col-md-4 mb-4">
                <div class="card heritage-detail-card h-100 p-3">
                    <h5>${item.icon} ${item.title}</h5>
                    <p>${item.description}</p>
                </div>
            </div>
        `);
    });
}

function filterHeritage(type) {
    const cards = $('.heritage-detail-card');
    $('#heritage-container .loader, #heritage-container p').hide(); // cacher loader si actif

    if (type === 'all') { cards.parent().show(); return; }

    cards.each(function () {
        const cardText = $(this).text().toLowerCase();
        let show = false;
        switch(type){
            case 'monument': show = cardText.includes('monument') || cardText.includes('🏛️'); break;
            case 'tradition': show = cardText.includes('tradition') || cardText.includes('🎭'); break;
            case 'art': show = cardText.includes('art') || cardText.includes('🎨'); break;
            case 'language': show = cardText.includes('langue') || cardText.includes('🗣️'); break;
        }
        $(this).parent().toggle(show);
    });
}

// =====!======================================= // INITIALISATION JQUERY // ============================================
$(document).ready(function () {
    const page = window.location.pathname.split('/').pop();

    // PAYS
    if (page === 'projet.html' || page === '') loadRandomCountries(3);
    if (page === 'explorer.html') {
        loadAllCountries();
        $('.region-filter').on('click', function () { filterByRegion($(this).data('region')); });
        $('#country-search').on('keyup', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(searchCountries, 300);
        });
    }

    // CONTACT
    if (page === 'contact.html') $('#contact-form').on('submit', validateContactForm);
    if (page === 'dashboard.html') {
        loadDashboard();
}

    // PATRIMOINE
    if (page === 'heritage.html') {
        if (typeof loadCulturalHeritage === 'function') loadCulturalHeritage();
        $('.heritage-filter').on('click', function () {
            filterHeritage($(this).data('type'));
        });
    
}
       
    

        // Bouton "Tout voir"
        $('.btn-outline-secondary').on('click', function() { filterHeritage('all'); });
    
});
document.addEventListener('DOMContentLoaded', function() {
    const navbarCollapse = document.getElementById('navbarNav');
    const navbarToggler = document.querySelector('.navbar-toggler');

    // Fonction pour activer le focus sur la navbar quand elle est ouverte
    function toggleNavbarFocus(expanded) {
        if (expanded) {
            navbarCollapse.removeAttribute('inert');
            // optionnel : mettre le focus sur le premier lien
            const firstLink = navbarCollapse.querySelector('a.nav-link');
            if (firstLink) firstLink.focus();
        } else {
            // retirer focus de tout élément à l’intérieur avant de masquer
            const focused = document.activeElement;
            if (navbarCollapse.contains(focused)) focused.blur();
            navbarCollapse.setAttribute('inert', '');
        }
    }

    // Événements Bootstrap collapse
    navbarCollapse.addEventListener('shown.bs.collapse', () => toggleNavbarFocus(true));
    navbarCollapse.addEventListener('hidden.bs.collapse', () => toggleNavbarFocus(false));
});
// ============================================
// VALIDATION FORMULAIRE CONTACT (JS PUR)
// ============================================

function resetContactForm() {
    document.getElementById('contact-form').reset();
    document.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });
    document.getElementById('success-message').classList.add('d-none');
    document.getElementById('contact-form').style.display = 'block';
}


function isValidEmailSimple(email) {
    email = email.trim();

    if (email.includes(' ')) return false;
    if (!email.includes('@')) return false;
    if (!email.includes('.')) return false;

    const at = email.indexOf('@');
    const dot = email.lastIndexOf('.');

    if (at === 0) return false;
    if (dot < at + 2) return false;
    if (dot === email.length - 1) return false;

    return true;
}

function validateContactForm(event) {
    event.preventDefault();
    let isValid = true;

    // Champs
    const name = document.getElementById('contact-name');
    const email = document.getElementById('contact-email');
    const subject = document.getElementById('contact-subject');
    const category = document.getElementById('contact-category');
    const message = document.getElementById('contact-message');

    // Reset erreurs
    document.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });

    // Nom
    if (name.value.trim().length < 2) {
        name.classList.add('is-invalid');
        isValid = false;
    }

    // Email
    if (!isValidEmailSimple(email.value)) {
        email.classList.add('is-invalid');
        isValid = false;
    }

    // Sujet
    if (subject.value.trim().length < 5) {
        subject.classList.add('is-invalid');
        isValid = false;
    }

    // Catégorie
    if (!category.value) {
        category.classList.add('is-invalid');
        isValid = false;
    }

    // Message
    if (message.value.trim().length < 10) {
        message.classList.add('is-invalid');
        isValid = false;
    }

    // Succès
    if (isValid) {
        simulateFormSubmission();
    }
}

// Simulation envoi
function simulateFormSubmission() {
    document.getElementById('contact-form').style.display = 'none';

    const success = document.getElementById('success-message');
    success.classList.remove('d-none');
    success.innerHTML = `
        <div class="alert alert-success">
            ✅ <strong>Message envoyé avec succès !</strong><br>
            Nous vous répondrons dans les plus brefs délais.
        </div>
    `;
}

// Liaison formulaire
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', validateContactForm);
    }
});
const page = window.location.pathname.split('/').pop();

/* ================================
   Initialisation
================================ */
$(document).ready(function () {
    if (page === "dashboard.html") {
        loadDashboard();
    }
});

/* ================================
   Chargement principal
================================ */
function loadDashboard() {
    $.getJSON(RESTCOUNTRIES_ALL)
        .done(data => {
            renderDashboardStats(data);
            renderRegionTable(data);
            renderTopPopulationTable(data);
            renderCharts(data);
        })
        .fail(() => {
            $("#dashboard-stats").html(
                '<p class="text-danger text-center">Erreur de chargement des données</p>'
            );
        });
}

/* ================================
   Statistiques globales
================================ */
function renderDashboardStats(data) {

    // Supprimer le loader
    $("#dashboard-stats").remove();

    const totalCountries = data.length;

    const totalPopulation = data.reduce(
        (sum, c) => sum + (c.population || 0),
        0
    );

    const totalLanguages = new Set(
        data.flatMap(c =>
            c.languages ? Object.values(c.languages) : []
        )
    ).size;

    $("#total-countries-dash").text(totalCountries);
    $("#total-population-dash").text(
        (totalPopulation / 1e9).toFixed(2) + " Md"
    );
    $("#total-languages-dash").text(totalLanguages);
}

/* ================================
   Tableau des régions
================================ */
function renderRegionTable(data) {

    const regions = {};
    data.forEach(c => {
        if (c.region) {
            regions[c.region] = (regions[c.region] || 0) + 1;
        }
    });

    const total = data.length;
    const tbody = $("#regions-distribution").empty();

    Object.entries(regions).forEach(([region, count]) => {
        tbody.append(`
            <tr>
                <td>${region}</td>
                <td>${count}</td>
                <td>${((count / total) * 100).toFixed(1)}%</td>
            </tr>
        `);
    });
}

/* ================================
   Top 10 pays par population
================================ */
function renderTopPopulationTable(data) {

    const top10 = [...data]
        .sort((a, b) => b.population - a.population)
        .slice(0, 10);

    const tbody = $("#top-countries-table").empty();

    top10.forEach((c, i) => {
        tbody.append(`
            <tr>
                <td>${i + 1}</td>
                <td>${c.name.common}</td>
                <td>${c.population.toLocaleString()}</td>
            </tr>
        `);
    });
}

/* ================================
   Graphiques Chart.js
================================ */
function renderCharts(data) {

    /* --- Graphique régions --- */
    const regions = {};
    data.forEach(c => {
        if (c.region) {
            regions[c.region] = (regions[c.region] || 0) + 1;
        }
    });

    const regionCtx = document
        .getElementById("regionChart")
        .getContext("2d");

    new Chart(regionCtx, {
        type: "pie",
        data: {
            labels: Object.keys(regions),
            datasets: [{
                data: Object.values(regions)
            }]
        }
    });

    /* --- Graphique population --- */
    const top10 = [...data]
        .sort((a, b) => b.population - a.population)
        .slice(0, 10);

    const popCtx = document
        .getElementById("populationChart")
        .getContext("2d");

    new Chart(popCtx, {
        type: "bar",
        data: {
            labels: top10.map(c => c.name.common),
            datasets: [{
                data: top10.map(c => c.population)
            }]
        }
    });
}