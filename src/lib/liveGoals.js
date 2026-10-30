// What ECHO is on air for. The id is stored on the live stream; the admin sets it in the Live stream tab and the public page shows the label.
export const LIVE_GOALS=[
  {id:'broadcast',en:'Broadcast',ar:'بث مباشر'},
  {id:'event',en:'DJing in an Event',ar:'دي جي في فعالية'},
  {id:'home-studio',en:'DJing in Home Studio',ar:'دي جي من الاستوديو المنزلي'},
  {id:'chill-mix',en:'Chilling-out Mix Time',ar:'وقت المزج الهادئ'},
  {id:'radio',en:'Echo Radio Music',ar:'موسيقى راديو إيكو'},
];
export const liveGoal=id=>LIVE_GOALS.find(goal=>goal.id===id)||LIVE_GOALS[0];
