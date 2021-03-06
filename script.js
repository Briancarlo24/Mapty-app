'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
// Using the GEOLOCATION API

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const settingEdit = document.querySelectorAll('.setting-edit');
const settingDelete = document.querySelectorAll('.setting-delete');
const workoutSettings = document.querySelectorAll('.workout__settings');
const workoutSettingsMenu = document.querySelectorAll(
  '.workout__settings-menu'
);
const deleteWorkout = document.querySelector('.btn-delete');
const setting = document.querySelector('.workout');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user' position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    // workoutSettings.addEventListener('click', function (e) {
    // });

    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // Delete Workouts
    deleteWorkout.addEventListener('click', this.reset);

    // Settings
    document.addEventListener('click', this.workoutSettings.bind(this));

    // Edit
    settingEdit.forEach(edit => {
      edit.addEventListener('click', function (e) {
        console.log(e.target);
        alert('asdsa');
      });
    });

    // Delete
    settingDelete.forEach(del => {
      del.addEventListener('click', function (e) {
        console.log(e.target);
        alert('delete');
      });
    });
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        // Always bind a method when call inside an Eventlistener
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    // Display the map (https://leafletjs.com/index.html)
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // AddEventListener - When map is click
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    // closest() =  searches the parent element
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // return true only if everything is true
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // If validinput is not true
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If activity cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // If validinput is not true
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to workouts array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);
    // Render workout on list
    this._renderWorkout(workout);
    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    //Display Marker
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        ` ${workout.type === 'running' ? '?????????????' : '?????????????'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <div class="workout__settings">
    ...
      <ul class="workout__settings-menu hide-menu">
        <li class="setting setting-edit">Edit</li>
        <li class="setting setting-delete">Delete</li>
      </ul>
    </div>
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '?????????????' : '?????????????'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">???</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
         <span class="workout__icon">??????</span>
         <span class="workout__value">4.6</span>
         <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
         <span class="workout__icon">????????</span>
         <span class="workout__value">${workout.cadence}</span>
         <span class="workout__unit">spm</span>
        </div>
      </li>
        `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">??????</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">???</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // Had to disable since - Lecture 242 Working with local Storage: 20 mins mark
    // workout.click();
  }

  // Using an API "localStorage" that the browser provides
  _setLocalStorage() {
    // JSON.stringify = converts objects to JSON String
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    // JSON.parse = convers JSON STRING to Object
    const data = JSON.parse(localStorage.getItem('workouts'));
    // If there's no data. simply return
    if (!data) return;

    // restores the data
    this.#workouts = data;
    this.#workouts.forEach(work => this._renderWorkout(work));
  }
  // clears the data
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  workoutSettings(e) {
    // workoutSettings.forEach((el, i) => {
    //   if (e.target === workoutSettings[i])
    //     workoutSettingsMenu[i].classList.remove('hide-menu');
    //   if (e.target !== workoutSettings[i])
    //     workoutSettingsMenu[i].classList.add('hide-menu');
    // });
    document.querySelector('.workouts').addEventListener('click', function (e) {
      const btnMenu = e.target.closest('.workout__settings');

      // show menu
      if (e.target.classList.contains('workout__settings')) {
        e.target
          .querySelector('.workout__settings-menu')
          .classList.toggle('hide-menu');
      }
    });
  }

  settingEdit(e) {}

  settingDelete(e) {}
}

const app = new App();
