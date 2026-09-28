// ============================================================================
// Workaut — app logic
// Auth/approval/admin-impersonation architecture ported from the previous
// production app (My Workout Tracker). Exercise library, portion tagging and
// the automated generator (Rookie/Normal/Expert/God Mode) are also ported
// verbatim from that app, keyed internally by their original Portuguese
// muscle-group names (matching the free-exercise-db curation), and only
// translated to English at display time via GROUP_LABEL_EN, since all UI
// text must be in English.
// ============================================================================

// ---- Firebase config: fill in with your own project's config ----
const firebaseConfig = {
  apiKey: "AIzaSyCZ4d-w15dWIkckcZr5WX-1v2FrkVANUXg",
  authDomain: "workaut-563ef.firebaseapp.com",
  projectId: "workaut-563ef",
  storageBucket: "workaut-563ef.firebasestorage.app",
  messagingSenderId: "905730827262",
  appId: "1:905730827262:web:a434efff8824c2f30856af",
  measurementId: "G-ENKB8LK77L"
};
const ADMIN_EMAIL = "theworkautapp@gmail.com";

let fb = null;
let fbUser = null;
let approvalUnsub = null;
let cloudReady = false;
let dataDirty = false;

// ---- Exercise library (ported verbatim from free-exercise-db curation) ----
const EX_IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const MUSCLE_GROUPS = ["Peito","Costas","Ombros","Bíceps","Tríceps","Abdômen","Perna"];
const GROUP_LABEL_EN = {
  "Peito":"Chest", "Costas":"Back", "Ombros":"Shoulders",
  "Bíceps":"Biceps", "Tríceps":"Triceps", "Abdômen":"Abs", "Perna":"Legs"
};

const EXERCISE_LIBRARY = {
  "Peito": [
    ["Barbell Bench Press - Medium Grip","Barbell_Bench_Press_-_Medium_Grip"],
    ["Barbell Incline Bench Press - Medium Grip","Barbell_Incline_Bench_Press_-_Medium_Grip"],
    ["Barbell Guillotine Bench Press","Barbell_Guillotine_Bench_Press"],
    ["Bench Press - With Bands","Bench_Press_-_With_Bands"],
    ["Bent-Arm Dumbbell Pullover","Bent-Arm_Dumbbell_Pullover"],
    ["Bodyweight Flyes","Bodyweight_Flyes"],
    ["Alternating Floor Press","Alternating_Floor_Press"],
    ["Around The Worlds","Around_The_Worlds"],
    ["Machine Chest Fly", null],
    ["Cable Chest Press", null],
    ["Cable Crossover", null],
    ["Cable Iron Cross", null],
    ["Decline Barbell Bench Press", null],
    ["Decline Dumbbell Bench Press", null],
    ["Decline Push-Up", null],
    ["Low-to-High Cable Fly", null]
  ],
  "Tríceps": [
    ["Band Skull Crusher","Band_Skull_Crusher"],
    ["Bench Dips","Bench_Dips"],
    ["Bench Press - Powerlifting","Bench_Press_-_Powerlifting"],
    ["Bench Press with Chains","Bench_Press_with_Chains"],
    ["Board Press","Board_Press"],
    ["Body-Up","Body-Up"],
    ["Body Tricep Press","Body_Tricep_Press"],
    ["Cable Incline Triceps Extension", null],
    ["Cable Lying Triceps Extension", null],
    ["Cable One Arm Tricep Extension", null],
    ["Cable Rope Overhead Triceps Extension", null],
    ["Tricep Pushdown (Rope)", null],
    ["Tricep Pushdown (Bar)", null],
    ["Overhead Dumbbell Triceps Extension", null],
    ["Close-Grip Bench Press", null]
  ],
  "Bíceps": [
    ["Alternate Hammer Curl","Alternate_Hammer_Curl"],
    ["Alternate Incline Dumbbell Curl","Alternate_Incline_Dumbbell_Curl"],
    ["Barbell Curl","Barbell_Curl"],
    ["Barbell Curls Lying Against An Incline","Barbell_Curls_Lying_Against_An_Incline"],
    ["Cable Hammer Curls (Rope Attachment)", null],
    ["Cable Preacher Curl", null],
    ["Concentration Curl", null],
    ["Seated Dumbbell Curl", null],
    ["Zottman Curl", null],
    ["EZ-Bar Curl", null],
    ["Cable Wrist Curl", null],
    ["Reverse Wrist Curl", null],
    ["Wrist Roller", null],
    ["Farmer's Walk", null],
    ["Bottoms-Up Clean From The Hang Position", "Bottoms-Up_Clean_From_The_Hang_Position"]
  ],
  "Costas": [
    ["Alternating Kettlebell Row","Alternating_Kettlebell_Row"],
    ["Alternating Renegade Row","Alternating_Renegade_Row"],
    ["Bent Over Barbell Row","Bent_Over_Barbell_Row"],
    ["Bent Over One-Arm Long Bar Row","Bent_Over_One-Arm_Long_Bar_Row"],
    ["Bent Over Two-Arm Long Bar Row","Bent_Over_Two-Arm_Long_Bar_Row"],
    ["Bent Over Two-Dumbbell Row","Bent_Over_Two-Dumbbell_Row"],
    ["Bent Over Two-Dumbbell Row With Palms In","Bent_Over_Two-Dumbbell_Row_With_Palms_In"],
    ["Bent-Arm Barbell Pullover","Bent-Arm_Barbell_Pullover"],
    ["Band Assisted Pull-Up","Band_Assisted_Pull-Up"],
    ["Bodyweight Mid Row","Bodyweight_Mid_Row"],
    ["Atlas Stone Trainer","Atlas_Stone_Trainer"],
    ["Atlas Stones","Atlas_Stones"],
    ["Axle Deadlift","Axle_Deadlift"],
    ["Barbell Deadlift","Barbell_Deadlift"],
    ["Cable Deadlifts", null],
    ["Cable Incline Pushdown", null],
    ["Barbell Shrug", null],
    ["Barbell Shrug Behind The Back", null],
    ["Cable Shrugs", null],
    ["Dumbbell Shrug", null]
  ],
  "Ombros": [
    ["Alternating Cable Shoulder Press","Alternating_Cable_Shoulder_Press"],
    ["Alternating Deltoid Raise","Alternating_Deltoid_Raise"],
    ["Alternating Kettlebell Press","Alternating_Kettlebell_Press"],
    ["Arnold Dumbbell Press","Arnold_Dumbbell_Press"],
    ["Backward Medicine Ball Throw","Backward_Medicine_Ball_Throw"],
    ["Band Pull Apart","Band_Pull_Apart"],
    ["Barbell Incline Shoulder Raise","Barbell_Incline_Shoulder_Raise"],
    ["Barbell Rear Delt Row","Barbell_Rear_Delt_Row"],
    ["Barbell Shoulder Press","Barbell_Shoulder_Press"],
    ["Bent Over Dumbbell Rear Delt Raise With Head On Bench","Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench"],
    ["Bent Over Low-Pulley Side Lateral","Bent_Over_Low-Pulley_Side_Lateral"],
    ["Battling Ropes","Battling_Ropes"],
    ["Back Flyes - With Bands","Back_Flyes_-_With_Bands"],
    ["Cable Internal Rotation", null],
    ["Cable Rear Delt Fly", null],
    ["Cable Rope Rear-Delt Rows", null],
    ["Cable Seated Lateral Raise", null],
    ["Cable Shoulder Press", null]
  ],
  "Perna": [
    ["Alternate Leg Diagonal Bound","Alternate_Leg_Diagonal_Bound"],
    ["Backward Drag","Backward_Drag"],
    ["Balance Board","Balance_Board"],
    ["Barbell Full Squat","Barbell_Full_Squat"],
    ["Barbell Hack Squat","Barbell_Hack_Squat"],
    ["Barbell Lunge","Barbell_Lunge"],
    ["Barbell Side Split Squat","Barbell_Side_Split_Squat"],
    ["Barbell Squat","Barbell_Squat"],
    ["Barbell Squat To A Bench","Barbell_Squat_To_A_Bench"],
    ["Barbell Step Ups","Barbell_Step_Ups"],
    ["Barbell Walking Lunge","Barbell_Walking_Lunge"],
    ["Bear Crawl Sled Drags","Bear_Crawl_Sled_Drags"],
    ["Bench Jump","Bench_Jump"],
    ["Bench Sprint","Bench_Sprint"],
    ["Bodyweight Squat","Bodyweight_Squat"],
    ["Bodyweight Walking Lunge","Bodyweight_Walking_Lunge"],
    ["Box Squat","Box_Squat"],
    ["Box Squat with Bands","Box_Squat_with_Bands"],
    ["Box Squat with Chains","Box_Squat_with_Chains"],
    ["Box Jump (Multiple Response)","Box_Jump_Multiple_Response"],
    ["Box Skip","Box_Skip"],
    ["Ball Leg Curl","Ball_Leg_Curl"],
    ["Band Good Morning","Band_Good_Morning"],
    ["Band Good Morning (Pull Through)","Band_Good_Morning_Pull_Through"],
    ["Barbell Glute Bridge","Barbell_Glute_Bridge"],
    ["Barbell Hip Thrust","Barbell_Hip_Thrust"],
    ["Barbell Seated Calf Raise","Barbell_Seated_Calf_Raise"],
    ["Band Hip Adductions","Band_Hip_Adductions"],
    ["Alternating Hang Clean","Alternating_Hang_Clean"],
    ["Butt Lift (Bridge)", null],
    ["Calf Press", null],
    ["Calf Press On The Leg Press Machine", null],
    ["Calf Raise On A Dumbbell", null],
    ["Calf Raises - With Bands", null],
    ["Cable Hip Adduction", null]
  ],
  "Abdômen": [
    ["3/4 Sit-Up","3_4_Sit-Up"],
    ["Ab Crunch Machine","Ab_Crunch_Machine"],
    ["Ab Roller","Ab_Roller"],
    ["Advanced Kettlebell Windmill","Advanced_Kettlebell_Windmill"],
    ["Air Bike","Air_Bike"],
    ["Alternate Heel Touchers","Alternate_Heel_Touchers"],
    ["Barbell Ab Rollout","Barbell_Ab_Rollout"],
    ["Barbell Ab Rollout - On Knees","Barbell_Ab_Rollout_-_On_Knees"],
    ["Barbell Side Bend","Barbell_Side_Bend"],
    ["Barbell Rollout from Bench","Barbell_Rollout_from_Bench"],
    ["Bosu Ball Cable Crunch With Side Bends","Bosu_Ball_Cable_Crunch_With_Side_Bends"],
    ["Bent-Knee Hip Raise","Bent-Knee_Hip_Raise"],
    ["Bottoms Up","Bottoms_Up"],
    ["Bent Press","Bent_Press"],
    ["Butt-Ups", null],
    ["Cable Crunch", null],
    ["Cable Judo Flip", null],
    ["Cable Reverse Crunch", null],
    ["Cable Russian Twists", null],
    ["Cable Seated Crunch", null]
  ]
};

const EXERCISE_PORTIONS = {
  "Peito": {
    "superior": ["Barbell Incline Bench Press - Medium Grip"],
    "medio": ["Barbell Bench Press - Medium Grip","Barbell Guillotine Bench Press","Bench Press - With Bands","Bodyweight Flyes","Alternating Floor Press","Around The Worlds","Machine Chest Fly","Cable Chest Press","Cable Crossover","Cable Iron Cross","Bent-Arm Dumbbell Pullover"],
    "inferior": ["Decline Barbell Bench Press","Decline Dumbbell Bench Press","Decline Push-Up","Low-to-High Cable Fly"]
  },
  "Ombros": {
    "anterior": ["Alternating Cable Shoulder Press","Alternating Kettlebell Press","Arnold Dumbbell Press","Barbell Shoulder Press","Cable Shoulder Press","Barbell Incline Shoulder Raise"],
    "lateral": ["Alternating Deltoid Raise","Cable Seated Lateral Raise","Battling Ropes"],
    "posterior": ["Band Pull Apart","Barbell Rear Delt Row","Bent Over Dumbbell Rear Delt Raise With Head On Bench","Bent Over Low-Pulley Side Lateral","Back Flyes - With Bands","Cable Rear Delt Fly","Cable Rope Rear-Delt Rows","Backward Medicine Ball Throw"]
  },
  "Perna": {
    "quadriceps": ["Barbell Full Squat","Barbell Hack Squat","Barbell Lunge","Barbell Side Split Squat","Barbell Squat","Barbell Squat To A Bench","Barbell Step Ups","Barbell Walking Lunge","Bodyweight Squat","Bodyweight Walking Lunge","Box Squat","Box Squat with Bands","Box Squat with Chains","Balance Board","Alternate Leg Diagonal Bound"],
    "posterior_coxa": ["Ball Leg Curl","Band Good Morning","Band Good Morning (Pull Through)","Alternating Hang Clean","Backward Drag"],
    "gluteos": ["Barbell Glute Bridge","Barbell Hip Thrust","Butt Lift (Bridge)","Cable Hip Adduction","Band Hip Adductions"],
    "panturrilha": ["Barbell Seated Calf Raise","Calf Press","Calf Press On The Leg Press Machine","Calf Raise On A Dumbbell","Calf Raises - With Bands"]
  }
};

const ADVANCED_ONLY_EXTRAS = new Set([
  "Barbell Shrug","Barbell Shrug Behind The Back","Cable Shrugs","Dumbbell Shrug",
  "Cable Wrist Curl","Reverse Wrist Curl","Wrist Roller","Farmer's Walk"
]);

function shuffled(arr){
  const a = arr.slice();
  for(let i=a.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function libIdFor(group, name){
  const entry = (EXERCISE_LIBRARY[group]||[]).find(e => e[0] === name);
  return entry ? entry[1] : null;
}
function pickFromGroup(group, count, used, allowExtras){
  let pool = (EXERCISE_LIBRARY[group]||[]).map(e=>e[0]).filter(n => !used.has(n));
  if(!allowExtras) pool = pool.filter(n => !ADVANCED_ONLY_EXTRAS.has(n));
  const chosen = shuffled(pool).slice(0, count);
  chosen.forEach(n => used.add(n));
  return chosen.map(n => ({ name:n, group, libId: libIdFor(group,n) }));
}
function pickBalanced(group, count, used, allowExtras){
  const portions = EXERCISE_PORTIONS[group];
  if(!portions) return pickFromGroup(group, count, used, allowExtras);
  const portionNames = Object.keys(portions);
  const result = [];
  let i = 0;
  while(result.length < count && i < count*portionNames.length + portionNames.length){
    const portion = portionNames[i % portionNames.length];
    const pool = portions[portion].filter(n => !used.has(n));
    if(pool.length){
      const pick = shuffled(pool)[0];
      used.add(pick);
      result.push({ name:pick, group, libId: libIdFor(group,pick) });
    }
    i++;
  }
  return result;
}
function pickExercises(group, count, used, allowExtras){
  if(count <= 0) return [];
  return EXERCISE_PORTIONS[group] ? pickBalanced(group, count, used, allowExtras) : pickFromGroup(group, count, used, allowExtras);
}
function dayFromSpec(spec, used, extraGroup, allowExtras){
  let exercises = [];
  spec.groups.forEach(g => {
    let count = g.count;
    if(extraGroup && g.group === extraGroup) count += 2;
    exercises = exercises.concat(pickExercises(g.group, count, used, allowExtras));
  });
  const muscleGroups = spec.groups.map(g=>g.group);
  return { label: spec.label, groups: muscleGroups, exercises };
}

function rookieTemplate(){
  return { label:"Full Body", groups:[
    {group:"Peito",count:1},{group:"Costas",count:1},{group:"Ombros",count:1},
    {group:"Bíceps",count:1},{group:"Tríceps",count:1},{group:"Abdômen",count:1},{group:"Perna",count:2}
  ] };
}
function normalTemplate(){
  return [
    { label:"Push", groups:[{group:"Peito",count:3},{group:"Ombros",count:2},{group:"Tríceps",count:2}] },
    { label:"Pull", groups:[{group:"Costas",count:5},{group:"Bíceps",count:2}] },
    { label:"Legs", groups:[{group:"Perna",count:6},{group:"Abdômen",count:1}] }
  ];
}
function advancedTemplate(){
  return [
    { label:"Chest + Shoulders", groups:[{group:"Peito",count:4},{group:"Ombros",count:3}] },
    { label:"Back", groups:[{group:"Costas",count:6}] },
    { label:"Legs", groups:[{group:"Perna",count:7},{group:"Abdômen",count:2}] },
    { label:"Shoulders + Back", groups:[{group:"Ombros",count:3},{group:"Costas",count:3}] },
    { label:"Arms", groups:[{group:"Bíceps",count:4},{group:"Tríceps",count:3}] }
  ];
}
function godTemplate(){
  return [
    { label:"Chest + Shoulders", groups:[{group:"Peito",count:5},{group:"Ombros",count:4}] },
    { label:"Back", groups:[{group:"Costas",count:7}] },
    { label:"Legs", groups:[{group:"Perna",count:8},{group:"Abdômen",count:4}] },
    { label:"Shoulders + Back", groups:[{group:"Ombros",count:4},{group:"Costas",count:4}] },
    { label:"Arms", groups:[{group:"Bíceps",count:5},{group:"Tríceps",count:4}] }
  ];
}
function cycleToLength(templateArr, days){
  return Array.from({length:days}, (_,i) => templateArr[i % templateArr.length]);
}

// Returns an array of { label, groups:[PortugueseGroupNames], exercises:[{name,group,libId}] }
function generateAutomatedPlan(days, level, focusGroup){
  const used = new Set();
  let dayPlans = [];
  const allowExtras = (level === "advanced" || level === "god");

  if(level === "rookie"){
    const template = dayFromSpec(rookieTemplate(), used, null, allowExtras);
    dayPlans = Array.from({length: days}, () => JSON.parse(JSON.stringify(template)));
  } else if(level === "normal"){
    const specs = cycleToLength(normalTemplate(), days);
    dayPlans = specs.map(spec => dayFromSpec(spec, used, null, allowExtras));
  } else if(level === "advanced"){
    const specs = cycleToLength(advancedTemplate(), days);
    dayPlans = specs.map(spec => dayFromSpec(spec, used, focusGroup, allowExtras));
  } else if(level === "god"){
    const godBase = godTemplate();
    const baseSpecs = godBase.length <= days ? godBase : godBase.slice(0, days);
    const extraDays = Math.max(0, days - 5);
    dayPlans = baseSpecs.map(spec => dayFromSpec(spec, used, null, allowExtras));
    const usedForFocusDays = new Set();
    for(let i=0; i<extraDays; i++){
      const label = extraDays > 1 ? `Specialization ${i+1}: ${GROUP_LABEL_EN[focusGroup]}` : `Specialization: ${GROUP_LABEL_EN[focusGroup]}`;
      dayPlans.push(dayFromSpec({ label, groups:[{group:focusGroup, count:7}] }, usedForFocusDays, null, allowExtras));
    }
  }
  return dayPlans;
}

const LEVEL_DISPLAY = { rookie:"Rookie", normal:"Normal", advanced:"Expert", god:"God Mode" };

// ============================================================================
// App state
// ============================================================================
let state = {
  profile: { name:"", interests:[] },
  packs: [],
  calendarData: {},
  counters: { rookie:0, normal:0, advanced:0, god:0 },
  createdAt: null
};

const TODAY = new Date();
let calViewYear = TODAY.getFullYear();
let calViewMonth = TODAY.getMonth();
let selectedDateKey = null;
let loggingDateKey = null;
let activePackId = null;
let pendingGenerate = null; // { level, days, focusGroup }
let currentChecklistDay = null; // the generated dayPlan currently shown in the checklist
let currentChecklistState = []; // per-exercise UI state: {done, sets:[{weight,reps}], comment}
let adminImpersonating = null;
let adminOwnState = null;
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const cardPalette = ['card-1','card-2','card-3','card-4'];

// Hardcoded example IP packs — real partnerships plug in here later.
const SPECIAL_PACKS = [
  { id:'special-1', name:'Captain America', emoji:'🛡️', gradient:'linear-gradient(135deg,#4A6FA5,#7C9CC7)', desc:"A shield-ready circuit built around the moves that keep Captain America camera-ready.", price:'$4.99',
    days: [
      { label:'Chest + Triceps', groups:['Peito','Tríceps'] },
      { label:'Back + Biceps', groups:['Costas','Bíceps'] },
      { label:'Shoulders', groups:['Ombros'] },
      { label:'Legs', groups:['Perna'] }
    ]},
  { id:'special-2', name:'Creator Two', emoji:'🎬', gradient:'linear-gradient(135deg,#7C6CF0,#A79BFF)', desc:'A 4-day signature split from Creator Two.', price:'$4.99',
    days: [
      { label:'Push', groups:['Peito','Ombros','Tríceps'] },
      { label:'Pull', groups:['Costas','Bíceps'] },
      { label:'Legs', groups:['Perna'] },
      { label:'Core', groups:['Abdômen'] }
    ]},
  { id:'special-3', name:'Creator Three', emoji:'🎮', gradient:'linear-gradient(135deg,#3FA66B,#78CE9C)', desc:'A 3-day full-body pack from Creator Three.', price:'$4.99',
    days: [
      { label:'Full Body A', groups:['Peito','Costas','Perna'] },
      { label:'Full Body B', groups:['Ombros','Bíceps','Tríceps'] },
      { label:'Core + Legs', groups:['Abdômen','Perna'] }
    ]},
  { id:'special-4', name:'Creator Four', emoji:'🎧', gradient:'linear-gradient(135deg,#2E2A26,#54493D)', desc:'A 4-day pack from Creator Four.', price:'$4.99',
    days: [
      { label:'Chest + Shoulders', groups:['Peito','Ombros'] },
      { label:'Back', groups:['Costas'] },
      { label:'Arms', groups:['Bíceps','Tríceps'] },
      { label:'Legs + Core', groups:['Perna','Abdômen'] }
    ]}
];

// Fill each special's `exercises` on demand (kept out of the static object above for brevity)
function specialExercisesFor(day){
  const used = new Set();
  let exercises = [];
  day.groups.forEach(g => { exercises = exercises.concat(pickExercises(g, 3, used, true)); });
  return exercises;
}

function dateKey(y,m,d){ return y+'-'+(m+1)+'-'+d; }
function todayKey(){ return dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()); }
function letterFor(n){ return String.fromCharCode(65 + (n % 26)); }
function escapeHtml(str){
  return String(str==null?'':str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ============================================================================
// Navigation
// ============================================================================
function go(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-'+id);
  if(target){ target.classList.add('active'); target.scrollTop = 0; window.scrollTo(0,0); }
  if(id === 'calendar'){ renderCalendar(); }
  if(id === 'home'){ loggingDateKey = null; renderHome(); }
  if(id === 'profile-view'){ renderProfileView(); }
  if(id === 'gallery'){ renderGallery(); }
  if(id === 'generate-form'){ onDaysSliderInput(); }
  if(id === 'specials-gallery'){ renderSpecialsGallery(); }
}

function toast(msg){
  let el = document.getElementById('globalToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'globalToast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 1800);
}

// ============================================================================
// Persistence
// ============================================================================
function save(){
  dataDirty = true;
  if(adminImpersonating){
    if(fb) fb.db.collection('users').doc(adminImpersonating.uid).set({ data: state }, { merge:true }).catch(()=>{});
    return;
  }
  if(!cloudReady) return;
  if(fb && fbUser) fb.db.collection('users').doc(fbUser.uid).set({ data: state }, { merge:true }).catch(()=>{});
}

async function loadFromFirestore(){
  try {
    const snap = await fb.db.collection('users').doc(fbUser.uid).get();
    if(snap.exists){
      const d = snap.data() || {};
      if(d.data) state = Object.assign({ profile:{name:'',interests:[]}, packs:[], calendarData:{}, counters:{rookie:0,normal:0,advanced:0,god:0} }, JSON.parse(JSON.stringify(d.data)));
    }
  } catch(e) { /* keep local defaults */ }
  cloudReady = true;
  if(dataDirty) save();
  bootIntoApp();
}

// ============================================================================
// Profile setup / editing
// ============================================================================
function onNameInput(){
  const val = document.getElementById('nameInput').value.trim();
  document.getElementById('nameNextBtn').disabled = val.length === 0;
}
function toggleChip(el){ el.classList.toggle('selected'); }

function finishSetup(){
  const name = document.getElementById('nameInput').value.trim() || 'Friend';
  const selected = Array.from(document.querySelectorAll('#interestGrid .chip.selected')).map(c => c.textContent);
  state.profile = { name, interests: selected };
  if(!state.createdAt) state.createdAt = new Date().toISOString();
  save();
  go('home');
}

function openEditProfile(){
  document.getElementById('editNameInput').value = state.profile.name || '';
  document.querySelectorAll('#editInterestGrid .chip').forEach(c => {
    c.classList.toggle('selected', (state.profile.interests||[]).includes(c.textContent));
  });
  go('edit-profile');
}
function saveEditProfile(){
  const val = document.getElementById('editNameInput').value.trim();
  if(val) state.profile.name = val;
  state.profile.interests = Array.from(document.querySelectorAll('#editInterestGrid .chip.selected')).map(c => c.textContent);
  save();
  toast('Profile updated');
  go('profile-view');
}

function renderHome(){
  document.getElementById('homeGreeting').textContent = 'Hello, ' + (state.profile.name || 'there');
  document.getElementById('homeDayNum').textContent = TODAY.getDate();
  document.getElementById('homeMonth').textContent = monthNames[TODAY.getMonth()];
  const isAdmin = fbUser && fbUser.email === ADMIN_EMAIL && !adminImpersonating;
  document.getElementById('adminEntryBtn').style.display = isAdmin ? '' : 'none';
}

function renderProfileView(){
  document.getElementById('pvName').textContent = state.profile.name || '—';
  document.getElementById('pvInterests').textContent = (state.profile.interests||[]).length ? state.profile.interests.join(', ') : '—';
  document.getElementById('pvPacks').textContent = state.packs.length;
  const created = state.createdAt ? new Date(state.createdAt) : new Date();
  document.getElementById('pvMemberSince').textContent = monthNames[created.getMonth()].slice(0,3) + ' ' + created.getFullYear();
  renderRadar();
}

function renderRadar(){
  // Counts logged exercises per muscle group across all calendar workout entries.
  const counts = {}; MUSCLE_GROUPS.forEach(g => counts[g] = 0);
  Object.values(state.calendarData).forEach(entry => {
    if(entry.type === 'workout' && entry.exercises){
      entry.exercises.forEach(ex => { if(counts[ex.group] != null) counts[ex.group]++; });
    }
  });
  const max = Math.max(1, ...Object.values(counts));
  const axes = MUSCLE_GROUPS;
  const cx = 118, cy = 140, r = 70;
  const angleFor = i => (Math.PI * 2 * i / axes.length) - Math.PI/2;
  function pt(i, scale){
    const a = angleFor(i);
    return [cx + Math.cos(a)*r*scale, cy + Math.sin(a)*r*scale];
  }
  let svg = '';
  [0.33, 0.66, 1].forEach(scale => {
    const pts = axes.map((g,i) => pt(i,scale).join(',')).join(' ');
    svg += `<polygon points="${pts}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
  });
  axes.forEach((g,i) => {
    const [x,y] = pt(i,1);
    svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
  });
  const dataPts = axes.map((g,i) => pt(i, Math.max(0.12, counts[g]/max)).join(',')).join(' ');
  svg += `<polygon points="${dataPts}" fill="var(--accent)" fill-opacity="0.35" stroke="var(--accent)" stroke-width="2"/>`;
  axes.forEach((g,i) => {
    const a = angleFor(i);
    const lx = cx + Math.cos(a)*(r+30), ly = cy + Math.sin(a)*(r+30);
    const anchor = Math.cos(a) > 0.3 ? 'start' : (Math.cos(a) < -0.3 ? 'end' : 'middle');
    svg += `<text x="${lx}" y="${ly}" text-anchor="${anchor}" font-size="10" font-weight="700" fill="var(--ink)">${GROUP_LABEL_EN[g]}</text>`;
  });
  document.getElementById('radarSvg').innerHTML = svg;
}

function openDeleteModal(){ document.getElementById('deleteModal').classList.add('active'); }
function closeDeleteModal(){
  document.getElementById('deleteModal').classList.remove('active');
  toast("Phew, that was close. Let's get moving.");
}
function confirmDelete(){
  document.getElementById('deleteModal').classList.remove('active');
  if(fb && fbUser && !adminImpersonating){
    fb.db.collection('users').doc(fbUser.uid).delete().catch(()=>{});
    const user = fb.auth.currentUser;
    if(user) user.delete().catch(()=>{ authLogout(); });
  }
}

// ============================================================================
// Gallery / packs
// ============================================================================
function muscleGroupsForLevel(level){
  const base = ['Peito','Costas','Ombros','Perna'];
  if(level === 'advanced' || level === 'god') base.push('Bíceps','Tríceps');
  return base;
}

function renderGallery(){
  const grid = document.getElementById('galleryGrid');
  const addSlot = grid.querySelector('.slot.add') || (() => {
    const s = document.createElement('div');
    s.className = 'slot add';
    s.textContent = '+';
    s.onclick = () => go('generate-shop');
    return s;
  })();
  grid.innerHTML = '';
  grid.appendChild(addSlot);
  state.packs.forEach(pack => {
    const slot = document.createElement('div');
    slot.className = 'slot filled';
    if(pack.kind === 'ip') slot.style.background = pack.gradient;
    else slot.classList.add(pack.colorClass);
    slot.textContent = pack.name;
    slot.onclick = () => openWallet(pack.id);
    grid.appendChild(slot);
  });
}

function startGenerate(){
  const level = document.querySelector('#levelGrid .level-btn.selected').dataset.level;
  const days = parseInt(document.getElementById('daysSlider').value, 10);
  let focusGroup = null;
  if(level === 'advanced' || level === 'god'){
    const chip = document.querySelector('#focusChipGrid .chip.selected');
    focusGroup = chip ? chip.dataset.group : 'Peito';
  }
  pendingGenerate = { level, days, focusGroup };
  const dayPlans = generateAutomatedPlan(days, level, focusGroup);
  pendingGenerate.dayPlans = dayPlans;
  renderOverview(dayPlans);
  go('overview');
}

function renderOverview(dayPlans){
  const list = document.getElementById('overviewList');
  list.innerHTML = '';
  // Show one representative row per exercise across the first day, to keep
  // the overview short — the full plan (all days) is what actually gets saved.
  const previewExercises = dayPlans[0] ? dayPlans[0].exercises : [];
  previewExercises.forEach(ex => {
    const row = document.createElement('div');
    row.className = 'exercise-row';
    row.innerHTML = `
      <div class="ex-accent"></div>
      <div class="ex-lines">
        <div class="ex-title">${escapeHtml(ex.name)}</div>
        <div class="ex-sub">${GROUP_LABEL_EN[ex.group]}</div>
      </div>
      <div class="ex-actions">
        <button onclick="toast('Swapped for a similar exercise')">⟳</button>
        <button onclick="toast('Exercise removed')">✕</button>
      </div>`;
    list.appendChild(row);
  });
  const note = document.createElement('div');
  note.className = 'small-note';
  note.textContent = dayPlans.length + ' day' + (dayPlans.length>1?'s':'') + ' total — shown here is day 1 of the plan.';
  list.appendChild(note);
}

function confirmWorkout(){
  const { level, dayPlans } = pendingGenerate;
  const counters = state.counters;
  const letter = letterFor(counters[level] || 0);
  counters[level] = (counters[level] || 0) + 1;
  const pack = {
    id: 'pack-' + Date.now(),
    name: LEVEL_DISPLAY[level] + ' ' + letter,
    kind: 'generated',
    colorClass: cardPalette[state.packs.length % cardPalette.length],
    days: dayPlans.map(d => ({ label:d.label, groups:d.groups, exercises:d.exercises }))
  };
  state.packs.push(pack);
  pendingGenerate = null;
  save();
  renderGallery();
  toast('Added to your collection');
  go('gallery');
}

function renderSpecialsGallery(){
  const grid = document.getElementById('specialsGrid');
  grid.innerHTML = '';
  SPECIAL_PACKS.forEach(sp => {
    const owned = state.packs.some(p => p.specialId === sp.id);
    const tile = document.createElement('div');
    tile.className = 'ip-tile';
    tile.style.background = sp.gradient;
    tile.innerHTML = `<div class="ip-avatar">${sp.emoji}</div>${escapeHtml(sp.name)}${owned ? '<span style="font-size:10px;opacity:.8;">Owned</span>' : ''}`;
    tile.onclick = () => openSpecialDetail(sp.id);
    grid.appendChild(tile);
  });
}

function openSpecialDetail(specialId){
  const sp = SPECIAL_PACKS.find(s => s.id === specialId);
  if(!sp) return;
  const owned = state.packs.some(p => p.specialId === sp.id);
  const previewDay = sp.days[0];
  const exercises = specialExercisesFor(previewDay);
  const box = document.getElementById('specialDetailContent');
  let rows = '';
  exercises.forEach((ex, i) => {
    const blur = i >= 2 && !owned ? ' blur-row' : '';
    rows += `<div class="exercise-row${blur}"><div class="ex-accent"></div><div class="ex-lines"><div class="ex-title">${escapeHtml(ex.name)}</div><div class="ex-sub">${GROUP_LABEL_EN[ex.group]}</div></div></div>`;
  });
  box.innerHTML = `
    <div class="special-hero">
      <div class="special-avatar" style="background:${sp.gradient};">${sp.emoji}</div>
      <div class="special-title">${escapeHtml(sp.name)}</div>
      <div class="special-desc">${escapeHtml(sp.desc)}</div>
    </div>
    ${rows}
    ${owned
      ? `<button class="btn dark" style="margin-top:auto;" onclick="openWalletForSpecial('${sp.id}')">Open pack</button>`
      : `<button class="btn primary" style="margin-top:auto;" onclick="unlockSpecial('${sp.id}')">Unlock pack — ${sp.price}</button>`}
  `;
  go('special-detail');
}

function unlockSpecial(specialId){
  const sp = SPECIAL_PACKS.find(s => s.id === specialId);
  if(!sp) return;
  if(state.packs.some(p => p.specialId === sp.id)){ openWalletForSpecial(specialId); return; }
  const pack = {
    id: 'pack-' + Date.now(),
    specialId: sp.id,
    name: sp.name,
    kind: 'ip',
    gradient: sp.gradient,
    days: sp.days.map(d => ({ label:d.label, groups:d.groups, exercises: specialExercisesFor(d) }))
  };
  state.packs.push(pack);
  save();
  renderGallery();
  toast('Pack unlocked!');
  setTimeout(() => go('gallery'), 500);
}
function openWalletForSpecial(specialId){
  const pack = state.packs.find(p => p.specialId === specialId);
  if(pack) openWallet(pack.id);
}

// Shifts a hex color's lightness by `percent` (-100..100) in HSL space, used
// to give each stacked card in one IP pack its own subtle shade while
// keeping the pack's hue recognizable.
function shadeHex(hex, percent){
  hex = hex.replace('#','');
  if(hex.length === 3) hex = hex.split('').map(c => c+c).join('');
  let r = parseInt(hex.substr(0,2),16)/255, g = parseInt(hex.substr(2,2),16)/255, b = parseInt(hex.substr(4,2),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if(max === min){ h = s = 0; }
  else {
    const d = max-min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    if(max===r) h = (g-b)/d + (g<b?6:0);
    else if(max===g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h /= 6;
  }
  l = Math.min(1, Math.max(0, l + percent/100));
  function hue2rgb(p,q,t){ if(t<0)t+=1; if(t>1)t-=1; if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p; }
  let r2,g2,b2;
  if(s === 0){ r2=g2=b2=l; } else {
    const q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
    r2 = hue2rgb(p,q,h+1/3); g2 = hue2rgb(p,q,h); b2 = hue2rgb(p,q,h-1/3);
  }
  function toHex(v){ const x = Math.round(v*255).toString(16); return x.length===1?'0'+x:x; }
  return '#'+toHex(r2)+toHex(g2)+toHex(b2);
}
function baseHexForGradient(gradientStr){
  const m = gradientStr.match(/#[0-9a-fA-F]{3,6}/);
  return m ? m[0] : '#FF5A36';
}

function openWallet(packId){
  const pack = state.packs.find(p => p.id === packId);
  if(!pack) return;
  activePackId = packId;
  document.getElementById('walletTitle').textContent = pack.name;
  const stack = document.getElementById('walletStack');
  stack.innerHTML = '';
  const ipBase = pack.kind === 'ip' ? baseHexForGradient(pack.gradient) : null;
  const shadeSteps = [10, 0, -10, -20];
  pack.days.forEach((day, i) => {
    const card = document.createElement('div');
    card.className = 'wallet-card';
    if(pack.kind === 'ip'){
      card.style.background = shadeHex(ipBase, shadeSteps[i % shadeSteps.length]);
    } else {
      const cls = cardPalette[i % cardPalette.length];
      card.style.background = `var(--${cls})`;
      if(cls === 'card-4') card.style.color = 'var(--card-4-ink)';
    }
    const badge = i === 0 ? '<span class="wc-badge">Recommended today</span>' : '';
    card.innerHTML = `<div class="wc-top"><div><div class="wc-name">${escapeHtml(day.label)}</div><div class="wc-sub">${day.exercises.length} exercises</div></div>${badge}</div><div class="wc-arrow">→</div>`;
    card.onclick = () => liftCard(card, pack, i);
    stack.appendChild(card);
  });
  go('workout-wallet');
}

function liftCard(el, pack, dayIndex){
  document.querySelectorAll('.wallet-card').forEach(c => c.classList.remove('lift'));
  el.classList.add('lift');
  setTimeout(() => openChecklist(pack, dayIndex), 220);
}
function backToWallet(){
  document.querySelectorAll('.wallet-card').forEach(c => c.classList.remove('lift'));
  go('workout-wallet');
}
function clearLiftAndGo(id){
  document.querySelectorAll('.wallet-card').forEach(c => c.classList.remove('lift'));
  go(id);
}

// ============================================================================
// Workout checklist (real exercises, sets/reps, comments, how-to image)
// ============================================================================
function openChecklist(pack, dayIndex){
  const day = pack.days[dayIndex];
  currentChecklistDay = { pack, dayIndex, day };
  currentChecklistState = day.exercises.map(() => ({ done:false, showHowTo:false, comment:'', sets:[{weight:'',reps:''}] }));
  document.getElementById('workoutDetailTitle').textContent = day.label;
  renderChecklist();
  go('workout-detail-picked');
}

function renderChecklist(){
  const list = document.getElementById('checklistList');
  const day = currentChecklistDay.day;
  list.innerHTML = '';
  day.exercises.forEach((ex, i) => {
    const ui = currentChecklistState[i];
    const row = document.createElement('div');
    row.className = 'check-row' + (ui.done ? ' checked' : '');
    const imgUrl = ex.libId ? (EX_IMG_BASE + ex.libId + '/0.jpg') : null;
    row.innerHTML = `
      <div class="check-row-top" onclick="toggleCheck(${i})">
        <div class="checkbox">${ui.done ? '✓' : ''}</div>
        <div class="ex-lines"><div class="ex-title">${escapeHtml(ex.name)}</div><div class="ex-sub">${GROUP_LABEL_EN[ex.group]}</div></div>
      </div>
      <div class="ex-detail">
        <div class="sets-wrap" id="sets-${i}"></div>
        <button class="add-set-btn" onclick="addSet(${i})">+ Add set</button>
        <textarea class="comment-input" rows="1" placeholder="Comment (optional)" oninput="setComment(${i}, this.value)">${escapeHtml(ui.comment)}</textarea>
        ${imgUrl ? `<button class="howto-btn" onclick="toggleHowTo(${i})">${ui.showHowTo ? 'Hide photo' : 'How to ▾'}</button>` : ''}
        ${(imgUrl && ui.showHowTo) ? `<img class="howto-img" src="${imgUrl}" alt="${escapeHtml(ex.name)}" onerror="this.style.display='none'">` : ''}
      </div>
    `;
    list.appendChild(row);
    renderSets(i);
  });
}
function renderSets(i){
  const wrap = document.getElementById('sets-'+i);
  if(!wrap) return;
  const sets = currentChecklistState[i].sets;
  wrap.innerHTML = sets.map((s, idx) => `
    <div class="set-row">
      <div class="set-idx">${idx+1}</div>
      <input type="text" inputmode="decimal" placeholder="Weight (kg)" value="${escapeHtml(s.weight)}" oninput="setSetField(${i},${idx},'weight',this.value)">
      <input type="text" inputmode="numeric" placeholder="Reps" value="${escapeHtml(s.reps)}" oninput="setSetField(${i},${idx},'reps',this.value)">
    </div>
  `).join('');
}
function toggleCheck(i){
  currentChecklistState[i].done = !currentChecklistState[i].done;
  renderChecklist();
}
function toggleHowTo(i){
  currentChecklistState[i].showHowTo = !currentChecklistState[i].showHowTo;
  renderChecklist();
}
function setComment(i, val){ currentChecklistState[i].comment = val; }
function setSetField(i, idx, field, val){ currentChecklistState[i].sets[idx][field] = val; }
function addSet(i){
  const sets = currentChecklistState[i].sets;
  const last = sets[sets.length-1];
  sets.push({ weight:last.weight||'', reps:last.reps||'' });
  renderSets(i);
}

function saveProgress(){
  const { day } = currentChecklistDay;
  const exercises = day.exercises.map((ex, i) => {
    const ui = currentChecklistState[i];
    return { name: ex.name, group: ex.group, done: ui.done, sets: ui.sets, comment: ui.comment };
  });
  const entry = { type:'workout', name: day.label, exercises, note: exercises.map(e=>e.comment).filter(Boolean).join(' · ') };

  if(loggingDateKey){
    state.calendarData[loggingDateKey] = entry;
    const key = loggingDateKey;
    loggingDateKey = null;
    save();
    toast('Workout logged');
    const parts = key.split('-');
    calViewYear = parseInt(parts[0],10);
    calViewMonth = parseInt(parts[1],10) - 1;
    selectedDateKey = key;
    go('calendar');
    return;
  }

  state.calendarData[todayKey()] = entry;
  save();
  go('home');
  setTimeout(burstFireOnHome, 80);
}

function burstFireOnHome(){
  const homeContent = document.querySelector('#screen-home .content');
  const burst = document.createElement('div');
  burst.className = 'fire-burst';
  homeContent.style.position = 'relative';
  homeContent.appendChild(burst);
  const count = 10;
  const dayEl = document.querySelector('.home-day');
  const cx = dayEl ? dayEl.offsetLeft + dayEl.offsetWidth/2 : 100;
  const cy = dayEl ? dayEl.offsetTop + dayEl.offsetHeight/2 : 150;
  for(let i=0;i<count;i++){
    const span = document.createElement('span');
    span.textContent = '🔥';
    const angle = (i/count) * Math.PI * 2;
    span.style.left = cx+'px';
    span.style.top = cy+'px';
    burst.appendChild(span);
    (function(span, angle){
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const dist = 90;
        span.style.opacity = '1';
        span.style.transform = `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px) scale(1)`;
        setTimeout(() => { span.style.opacity = '0'; }, 500);
      }));
    })(span, angle);
  }
  setTimeout(() => {
    burst.remove();
    toast('Nice work! Keep it up.');
    setTimeout(() => go('calendar'), 700);
  }, 900);
}

// ============================================================================
// Generate form UI wiring
// ============================================================================
function onDaysSliderInput(){
  const days = parseInt(document.getElementById('daysSlider').value, 10);
  document.getElementById('daysVal').textContent = days;
  const selected = document.querySelector('#levelGrid .level-btn.selected');
  updateLevelGating(days, selected ? selected.dataset.level : 'rookie');
}
function updateLevelGating(days, currentLevel){
  const advancedBtn = document.querySelector('#levelGrid .level-btn[data-level="advanced"]');
  const godBtn = document.querySelector('#levelGrid .level-btn[data-level="god"]');
  advancedBtn.disabled = days < 5;
  godBtn.disabled = days < 6;
  let level = currentLevel;
  if(level === 'advanced' && days < 5) level = 'normal';
  if(level === 'god' && days < 6) level = 'normal';
  document.querySelectorAll('#levelGrid .level-btn').forEach(b => b.classList.toggle('selected', b.dataset.level === level));
  document.getElementById('levelHint').textContent = (days < 5) ? 'Expert needs 5+ days, God Mode needs 6+ days.' : (days < 6 ? 'God Mode needs 6+ days.' : '');
  updateFocusGroupField(level);
}
function updateFocusGroupField(level){
  const field = document.getElementById('focusGroupField');
  if(level === 'advanced' || level === 'god'){
    field.style.display = '';
    const grid = document.getElementById('focusChipGrid');
    if(!grid.children.length){
      grid.innerHTML = MUSCLE_GROUPS.map((g,i) => `<div class="chip${i===0?' selected':''}" data-group="${g}" onclick="selectFocusChip(this)">${GROUP_LABEL_EN[g]}</div>`).join('');
    }
  } else {
    field.style.display = 'none';
  }
}
function selectFocusChip(el){
  document.querySelectorAll('#focusChipGrid .chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}
function selectLevel(el){
  if(el.disabled) return;
  document.querySelectorAll('#levelGrid .level-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  updateFocusGroupField(el.dataset.level);
}

// ============================================================================
// Calendar
// ============================================================================
function shiftMonth(delta){
  calViewMonth += delta;
  if(calViewMonth < 0){ calViewMonth = 11; calViewYear--; }
  if(calViewMonth > 11){ calViewMonth = 0; calViewYear++; }
  selectedDateKey = null;
  renderCalendar();
}
function isToday(y,m,d){ return y===TODAY.getFullYear() && m===TODAY.getMonth() && d===TODAY.getDate(); }
function isPastOrToday(y,m,d){
  const d1 = new Date(y,m,d), d2 = new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate());
  return d1 <= d2;
}
function renderCalendar(){
  document.getElementById('calMonth').textContent = monthNames[calViewMonth];
  document.getElementById('calYear').textContent = calViewYear;
  document.getElementById('calNum').textContent = isToday(calViewYear,calViewMonth,TODAY.getDate()) ? TODAY.getDate() : new Date(calViewYear,calViewMonth+1,0).getDate();

  const grid = document.getElementById('calDotGrid');
  grid.innerHTML = '';
  const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
  const leadingBlank = (firstDay + 6) % 7;
  const totalDays = new Date(calViewYear, calViewMonth+1, 0).getDate();
  for(let i=0;i<leadingBlank;i++) grid.appendChild(document.createElement('div'));

  for(let d=1; d<=totalDays; d++){
    const key = dateKey(calViewYear, calViewMonth, d);
    const entry = state.calendarData[key];
    const dot = document.createElement('button');
    dot.className = 'day-dot';
    dot.textContent = d;
    if(entry && entry.type === 'workout') dot.classList.add('done');
    else if(entry && entry.type === 'rest') dot.classList.add('rest');
    else if(isToday(calViewYear, calViewMonth, d)) dot.classList.add('today');
    if(!isPastOrToday(calViewYear, calViewMonth, d)) dot.classList.add('future');
    if(key === selectedDateKey) dot.classList.add('selected');
    dot.onclick = () => selectDay(calViewYear, calViewMonth, d, key);
    grid.appendChild(dot);
  }
  renderDayDetail();
}
function selectDay(y,m,d,key){
  if(!isPastOrToday(y,m,d)) return;
  selectedDateKey = (selectedDateKey === key) ? null : key;
  renderCalendar();
}
function renderDayDetail(){
  const box = document.getElementById('dayDetail');
  box.innerHTML = '';
  if(!selectedDateKey) return;
  const entry = state.calendarData[selectedDateKey];
  const parts = selectedDateKey.split('-');
  const label = monthNames[parseInt(parts[1],10)-1].slice(0,3) + ' ' + parts[2];

  const wrap = document.createElement('div');
  wrap.className = 'day-detail';
  const title = document.createElement('div');
  title.className = 'day-detail-title';
  title.textContent = label;
  wrap.appendChild(title);

  if(entry && entry.type === 'workout'){
    const card = document.createElement('div');
    card.className = 'log-card';
    card.innerHTML = `
      <div class="lc-top">
        <div><div class="lc-name">${escapeHtml(entry.name)}</div></div>
        <div style="display:flex; align-items:center; gap:8px;"><span class="lc-badge">Done</span><span class="lc-chevron">▾</span></div>
      </div>
      <div class="lc-expand"><div class="lc-expand-inner"></div></div>`;
    card.onclick = () => card.classList.toggle('open');
    wrap.appendChild(card);
    const inner = card.querySelector('.lc-expand-inner');
    entry.exercises.forEach(ex => {
      const setsText = (ex.sets||[]).map(s => (s.weight||'—')+'kg × '+(s.reps||'—')).join(', ');
      const row = document.createElement('div');
      row.className = 'lc-exercise';
      row.innerHTML = `<span class="exname">${escapeHtml(ex.name)}</span><span class="exmeta">${escapeHtml(setsText)}</span>`;
      inner.appendChild(row);
      if(ex.comment){
        const noteRow = document.createElement('div');
        noteRow.className = 'lc-note';
        noteRow.textContent = '"' + ex.comment + '"';
        inner.appendChild(noteRow);
      }
    });
    const restBtn = document.createElement('button');
    restBtn.className = 'rest-btn';
    restBtn.disabled = true;
    restBtn.textContent = 'Rest day (already trained)';
    wrap.appendChild(restBtn);

  } else if(entry && entry.type === 'rest'){
    const note = document.createElement('div');
    note.className = 'empty-day-note';
    note.textContent = 'Marked as a rest day.';
    wrap.appendChild(note);
    const restBtn2 = document.createElement('button');
    restBtn2.className = 'rest-btn marked';
    restBtn2.textContent = 'Rest day ✓';
    restBtn2.onclick = () => { delete state.calendarData[selectedDateKey]; save(); renderCalendar(); };
    wrap.appendChild(restBtn2);

  } else {
    const note2 = document.createElement('div');
    note2.className = 'empty-day-note';
    note2.textContent = 'No workout logged for this day.';
    wrap.appendChild(note2);
    const logBtn = document.createElement('button');
    logBtn.className = 'btn dark';
    logBtn.textContent = 'Log workout';
    logBtn.onclick = () => { loggingDateKey = selectedDateKey; go('gallery'); };
    wrap.appendChild(logBtn);
    const restBtn3 = document.createElement('button');
    restBtn3.className = 'rest-btn';
    restBtn3.textContent = 'Mark as rest day';
    restBtn3.onclick = () => { state.calendarData[selectedDateKey] = { type:'rest' }; save(); renderCalendar(); };
    wrap.appendChild(restBtn3);
  }
  box.appendChild(wrap);
}

// ============================================================================
// Firebase auth / approval gate / admin
// ============================================================================
function initFirebaseAuth(){
  if(typeof firebase === 'undefined'){
    document.getElementById('screen-loading').classList.remove('active');
    go('auth');
    toast('Running without a backend connection.');
    return;
  }
  try {
    firebase.initializeApp(firebaseConfig);
    fb = { auth: firebase.auth(), db: firebase.firestore() };
  } catch(e){
    fb = null;
    go('auth');
    return;
  }
  fb.auth.onAuthStateChanged(user => handleAuthUser(user));
}

function handleAuthUser(user){
  if(user && !user.emailVerified){
    fbUser = null;
    stopApprovalListener();
    document.getElementById('verifyEmailAddr').textContent = user.email || '';
    go('verify');
    return;
  }
  if(user){
    fbUser = user;
    if(user.email === ADMIN_EMAIL){ enterApp(); }
    else { watchApproval(user); }
  } else {
    fbUser = null;
    cloudReady = false;
    dataDirty = false;
    stopApprovalListener();
    go('auth');
  }
}

function enterApp(){
  loadFromFirestore();
}

function bootIntoApp(){
  if(!state.profile || !state.profile.name){
    go('profile-1');
  } else {
    go('home');
  }
  renderAdminBadge();
}

function stopApprovalListener(){ if(approvalUnsub){ approvalUnsub(); approvalUnsub = null; } }
function watchApproval(user){
  const ref = fb.db.collection('approvals').doc(user.uid);
  stopApprovalListener();
  approvalUnsub = ref.onSnapshot(snap => {
    if(!snap.exists){
      ref.set({ approved:false, email:user.email, requestedAt: new Date().toISOString() }).catch(()=>{});
      return;
    }
    const data = snap.data();
    if(data.approved){ enterApp(); }
    else { go('waiting'); }
  }, () => { go('waiting'); });
}
function checkApprovalNow(){
  toast("Not approved yet — you'll be notified automatically once it happens.");
}

function authFieldValues(){
  return { email: document.getElementById('authEmail').value.trim(), pass: document.getElementById('authPassword').value };
}
function showAuthError(msg, ok){
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
  el.classList.toggle('ok', !!ok);
}
function hideAuthError(){ document.getElementById('authError').style.display = 'none'; }
function translateAuthError(e){
  const code = (e && e.code) || '';
  const map = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-not-found': "Account not found. Try 'Create account'.",
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': "An account with this email already exists. Try 'Log in'.",
    'auth/weak-password': 'Password is too weak (min. 6 characters).',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/missing-password': 'Enter a password.',
    'auth/popup-closed-by-user': 'Google window closed before finishing.',
    'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups and try again.',
    'auth/account-exists-with-different-credential': 'This email is already registered with a password. Log in with email/password.'
  };
  return map[code] || 'Something went wrong. Please try again.';
}
function authLogin(){
  const {email, pass} = authFieldValues();
  hideAuthError();
  if(!email || !pass){ showAuthError('Enter your email and password.'); return; }
  fb.auth.signInWithEmailAndPassword(email, pass).catch(e => showAuthError(translateAuthError(e)));
}
function authSignup(){
  const {email, pass} = authFieldValues();
  hideAuthError();
  if(!email || !pass){ showAuthError('Enter your email and password.'); return; }
  if(pass.length < 6){ showAuthError('Password must be at least 6 characters.'); return; }
  fb.auth.createUserWithEmailAndPassword(email, pass)
    .then(cred => cred.user.sendEmailVerification().catch(()=>{}))
    .catch(e => showAuthError(translateAuthError(e)));
}
function authGoogleSignIn(){
  hideAuthError();
  const provider = new firebase.auth.GoogleAuthProvider();
  fb.auth.signInWithPopup(provider).catch(e => showAuthError(translateAuthError(e)));
}
function checkVerified(){
  const user = fb.auth.currentUser;
  if(!user) return;
  user.reload().then(() => {
    const refreshed = fb.auth.currentUser;
    if(refreshed.emailVerified){ handleAuthUser(refreshed); }
    else { document.getElementById('verifyError').style.display='block'; document.getElementById('verifyError').textContent = "Not verified yet. Check your inbox (and spam)."; }
  }).catch(() => {
    document.getElementById('verifyError').style.display='block';
    document.getElementById('verifyError').textContent = 'Error checking status. Try again.';
  });
}
function resendVerification(){
  const user = fb.auth.currentUser;
  if(!user) return;
  user.sendEmailVerification()
    .then(() => toast('Email resent'))
    .catch(() => toast('Error resending. Try again shortly.'));
}
function authReset(){
  const {email} = authFieldValues();
  hideAuthError();
  if(!email){ showAuthError('Enter your email above first.'); return; }
  fb.auth.sendPasswordResetEmail(email)
    .then(() => showAuthError('Password reset email sent.', true))
    .catch(e => showAuthError(translateAuthError(e)));
}
function authLogout(){
  stopApprovalListener();
  adminImpersonating = null;
  adminOwnState = null;
  if(fb) fb.auth.signOut();
}

// ---- Admin panel ----
function renderAdminBadge(){
  const badge = document.getElementById('adminBadge');
  if(adminImpersonating){
    badge.classList.add('show');
    document.getElementById('adminBadgeText').textContent = '🔧 Editing: ' + adminImpersonating.email;
  } else {
    badge.classList.remove('show');
  }
}

function openAdminPanel(){
  const box = document.getElementById('adminContent');
  box.innerHTML = '<div class="small-note">Loading requests…</div>';
  go('admin');
  fb.db.collection('approvals').get().then(snap => {
    const pending = [], approved = [];
    snap.forEach(doc => {
      const d = doc.data();
      (d.approved ? approved : pending).push({ uid: doc.id, ...d });
    });
    let html = '';
    html += `<div style="font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-soft);">Pending (${pending.length})</div>`;
    html += pending.length ? pending.map(p => `
      <div class="admin-row">
        <div class="admin-row-email">${escapeHtml(p.email||p.uid)}</div>
        <button class="btn small primary" onclick="approveUser('${p.uid}')">Approve</button>
      </div>`).join('') : '<div class="small-note">No pending requests.</div>';
    html += `<div style="font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-soft); margin-top:12px;">Approved (${approved.length})</div>`;
    html += approved.length ? approved.map(p => `
      <div class="admin-row">
        <div class="admin-row-email">${escapeHtml(p.email||p.uid)}</div>
        <div class="admin-row-actions">
          <button class="btn small outline" onclick="adminImpersonate('${p.uid}','${escapeHtml(p.email||p.uid)}')">🔑 Enter account</button>
          <button class="btn small danger" onclick="revokeUser('${p.uid}')">Revoke</button>
        </div>
      </div>`).join('') : '<div class="small-note">No one approved yet.</div>';
    box.innerHTML = html;
  }).catch(() => { box.innerHTML = '<div class="small-note">Could not load the list (check Firestore rules).</div>'; });
}
function approveUser(uid){
  fb.db.collection('approvals').doc(uid).update({ approved:true, approvedAt: new Date().toISOString() })
    .then(() => { toast('Access approved'); openAdminPanel(); })
    .catch(() => toast('Error approving. Try again.'));
}
function revokeUser(uid){
  fb.db.collection('approvals').doc(uid).update({ approved:false })
    .then(() => { toast('Access revoked'); openAdminPanel(); })
    .catch(() => toast('Error revoking. Try again.'));
}

function adminImpersonate(uid, email){
  adminOwnState = state;
  adminImpersonating = { uid, email };
  toast('Entering ' + email + "'s account…");
  fb.db.collection('users').doc(uid).get().then(snap => {
    const d = snap.exists ? (snap.data()||{}) : {};
    state = d.data ? JSON.parse(JSON.stringify(d.data)) : { profile:{name:'',interests:[]}, packs:[], calendarData:{}, counters:{rookie:0,normal:0,advanced:0,god:0} };
    renderAdminBadge();
    bootIntoApp();
  }).catch(() => {
    toast('Error loading that account.');
    state = adminOwnState; adminOwnState = null; adminImpersonating = null;
  });
}
function adminStopImpersonating(){
  state = adminOwnState;
  adminOwnState = null;
  adminImpersonating = null;
  renderAdminBadge();
  toast('Back to your own account.');
  bootIntoApp();
}

// ============================================================================
// Boot
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initFirebaseAuth();
});
initFirebaseAuth();