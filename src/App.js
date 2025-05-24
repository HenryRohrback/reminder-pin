// React web app version of the medication reminder app with Web Bluetooth integration

import React, { useState, useEffect } from 'react';
import './App.css';


function App() {
  const [reminderTime, setReminderTime] = useState('12:00');
  const [pillTakenToday, setPillTakenToday] = useState(false);
  const [streak, setStreak] = useState(0);
  const [device, setDevice] = useState(null);
  const [characteristic, setCharacteristic] = useState(null);
const [timeUntil, setTimeUntil] = useState('');
const [notifiedToday, setNotifiedToday] = useState(false);

const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission !== 'granted') {
    try {
      await Notification.requestPermission();
    } catch (e) {
      console.error('Notification permission error:', e);
    }
  }
};


  useEffect(() => {
    loadStreak();
  }, []);

useEffect(() => {
  requestNotificationPermission();
}, []);


  const loadStreak = () => {
    const today = new Date().toISOString().split('T')[0];
    const lastTaken = localStorage.getItem('lastTaken');
    const savedStreak = parseInt(localStorage.getItem('streak')) || 0;

    if (lastTaken === today) {
      setPillTakenToday(true);
    } else {
      setPillTakenToday(false);
    }
    setStreak(savedStreak);
setNotifiedToday(false);
  };


  const handleTimeChange = (event) => {
    setReminderTime(event.target.value);
    if (characteristic) {
      const timeParts = event.target.value.split(':');
      const payload = `SET:${timeParts[0]}:${timeParts[1]}`;
      characteristic.writeValue(new TextEncoder().encode(payload));
    }
  };

  const markPillTaken = () => {
    const today = new Date().toISOString().split('T')[0];
    const lastTaken = localStorage.getItem('lastTaken');
    let newStreak = streak;

    if (lastTaken !== today) {
      newStreak += 1;
      localStorage.setItem('streak', newStreak.toString());
      localStorage.setItem('lastTaken', today);
      setStreak(newStreak);
      setPillTakenToday(true);
    }
  };

  const connectToDevice = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'Xiao' }],
        optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb']
      });
      setDevice(device);

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
      const char = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
      setCharacteristic(char);

      char.startNotifications();
      char.addEventListener('characteristicvaluechanged', handleNotifications);
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
    }
  };


  const handleNotifications = (event) => {
    const value = new TextDecoder().decode(event.target.value);
    if (value.trim() === 'PILL_TAKEN') {
      markPillTaken();
    }
  };
useEffect(() => {
  const interval = setInterval(updateTimeUntil, 60000); // every 60 seconds
  updateTimeUntil(); // also run immediately
  return () => clearInterval(interval);
}, [reminderTime]);

const updateTimeUntil = () => {
  const now = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const nextPillTime = new Date();
  nextPillTime.setHours(hours, minutes, 0, 0);


  if (nextPillTime < now) {
    nextPillTime.setDate(nextPillTime.getDate() + 1); // if it's already passed today
  }

  const diffMs = nextPillTime - now;
  const diffMin = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;

  setTimeUntil(`${h}h ${m}m`);

 if (diffMin === 0 && !notifiedToday && Notification.permission === 'granted') {
    new Notification('Time to take your pill!', {
      body: 'Tap to open the app and confirm.',
      icon: '/logo192.png', // Optional logo path
    });
    setNotifiedToday(true);
  }
if (diffMin === 0 && !notifiedToday && Notification.permission === 'granted') {
  new Notification('Time to take your pill!', {
    body: 'Tap to open the app and confirm.',
    icon: '/logo192.png'
  });
  setNotifiedToday(true);
}
};

  return (
    <div className="App">
      <h1>Medication Reminder</h1>
<img src="/logo.svg" alt="App Logo" style={{ height: '100px' }} />
      <div className="card">
        <button onClick={connectToDevice}>Connect to Reminder Pin</button>
      </div>

      <div className="card">
        <label htmlFor="reminderTime">Set Reminder Time:</label>
        <input
          type="time"
          id="reminderTime"
          value={reminderTime}
          onChange={handleTimeChange}
        />
      </div>
<div className="card">
  <p><strong>Time until next pills:</strong> {timeUntil}</p>
</div>


      <div className="card">
        <button onClick={markPillTaken}>Mark Pills as Taken</button>
        {pillTakenToday && <p>Pills already taken today</p>}
      </div>

      <div className="card">
        <p><strong>Streak:</strong> {streak} days</p>
      </div>
    </div>
  );
}

export default App;
