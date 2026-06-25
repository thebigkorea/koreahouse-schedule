const API_URL =
"https://script.google.com/macros/s/AKfycbw8qlB6J4gP0ZNcI6p2SAs9I3SC1StektBfo_VktYO244TZWsHcknXMVYd8fOmSMbkM/exec";

let STAFF_LIST = [];
let CURRENT_SCHEDULE = [];

window.onload = async () => {
  createDayCheckboxes();
  await loadStaffList();

  const now = new Date();
  const month =
    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

  document.getElementById("offMonth").value = month;
  document.getElementById("scheduleMonth").value = month;
  document.getElementById("viewMonth").value = month;
};

function showTab(id){

  document
    .querySelectorAll(".panel")
    .forEach(el=>el.classList.remove("active"));

  document
    .querySelectorAll(".tab")
    .forEach(el=>el.classList.remove("active"));

  document
    .getElementById(id)
    .classList.add("active");

  event.target.classList.add("active");
}

function createDayCheckboxes(){

  const box =
    document.getElementById("offDayList");

  let html = "";

  for(let i=1;i<=31;i++){

    html += `
      <label>
        <input type="checkbox" value="${i}">
        ${i}일
      </label>
    `;
  }

  box.innerHTML = html;
}

async function api(data){

  const res = await fetch(API_URL,{
    method:"POST",
    body:JSON.stringify(data)
  });

  return await res.json();
}

async function loadStaffList(){

  const result = await api({
    action:"getStaffList"
  });

  if(!result.success) return;

  STAFF_LIST = result.staff || [];

  renderStaffSelect();
  renderStaffCards();
}

function renderStaffSelect(){

  const names =
    STAFF_LIST.map(s=>s.name);

  const html =
    names.map(name=>
      `<option value="${name}">${name}</option>`
    ).join("");

  document.getElementById("offName").innerHTML = html;
  document.getElementById("viewName").innerHTML = html;
}

function renderStaffCards(){

  const wrap =
    document.getElementById("staffList");

  wrap.innerHTML =
    STAFF_LIST.map(s=>`
      <div class="staff-card">
        <strong>${s.name}</strong>
        <div>${s.type}</div>
        <div>${s.role}</div>
      </div>
    `).join("");
}

async function saveStaff(){

  const name =
    document.getElementById("staffName").value.trim();

  if(!name){
    alert("직원명을 입력하세요.");
    return;
  }

  const result = await api({
    action:"saveStaff",
    name,
    type:document.getElementById("staffType").value,
    role:document.getElementById("staffRole").value
  });

  alert(result.message);

  document.getElementById("staffName").value = "";

  await loadStaffList();
}

async function saveOffRequest(){

  const month =
    document.getElementById("offMonth").value;

  const name =
    document.getElementById("offName").value;

  const reason =
    document.getElementById("offReason").value;

  const offDays =
    [...document.querySelectorAll("#offDayList input:checked")]
    .map(el=>el.value)
    .join(",");

  if(!offDays){
    alert("휴무일을 선택하세요.");
    return;
  }

  const result = await api({
    action:"saveOffRequest",
    month,
    name,
    offDays,
    reason
  });

  alert(result.message);

  document
    .querySelectorAll("#offDayList input")
    .forEach(el=>el.checked=false);

  document.getElementById("offReason").value="";
}

async function loadScheduleBase(){

  const month =
    document.getElementById("scheduleMonth").value;

  if(!month){
    alert("기준월 선택");
    return;
  }

  const requestResult =
    await api({
      action:"getOffRequests",
      month
    });

    console.log("선택한 월:", month);
    console.log("휴무신청 결과:", requestResult);

  const requests =
    requestResult.requests || [];

  renderRequestSummary(requests);

  CURRENT_SCHEDULE =
    STAFF_LIST.map(staff=>{

      const days = {};

      requests.forEach(r=>{

        if(r.name !== staff.name) return;

        String(r.offDays)
          .split(",")
          .forEach(day=>{

            days[day] =
              "request-off";
          });

      });

      return {
        name:staff.name,
        days
      };
    });

  renderScheduleTable();
}

function renderRequestSummary(requests){

  const wrap =
    document.getElementById("offRequestSummary");

  if(!requests.length){
    wrap.innerHTML = "휴무 신청 내역이 없습니다.";
    return;
  }

  wrap.innerHTML =
    requests.map(r=>`
      <div class="off-item">
        <div>
          <b>${r.name}</b> : ${r.offDays}
          <span class="status">[${r.status}]</span>
        </div>

        <div class="off-actions">
          <button onclick="updateOffStatus('${r.name}','${r.month}','${r.offDays}','승인')">
            승인
          </button>
          <button class="reject" onclick="updateOffStatus('${r.name}','${r.month}','${r.offDays}','반려')">
            반려
          </button>
        </div>
      </div>
    `).join("");
}

function renderScheduleTable(){

  const table =
    document.getElementById("scheduleTable");

  let html = `
    <tr>
      <th class="name-head">직원명</th>
  `;

  for(let d=1; d<=31; d++){
    html += `<th>${d}</th>`;
  }

  html += `</tr>`;

  CURRENT_SCHEDULE.forEach((staff,row)=>{

    html += `
      <tr>
        <td class="name-cell">${staff.name}</td>
    `;

    for(let d=1; d<=31; d++){

      const value =
        staff.days[d] || "work";

      html += `
        <td
          class="schedule-cell ${value}"
          onclick="toggleCell(${row},${d})"
        >
          ${cellText(value)}
        </td>
      `;
    }

    html += `</tr>`;
  });

  table.innerHTML = html;
}

function toggleCell(row,day){

  const current =
    CURRENT_SCHEDULE[row].days[day] || "work";

  const order = [
    "work",
    "request-off",
    "admin-off",
    "confirmed-off",
    "annual"
  ];

  let idx =
    order.indexOf(current);

  idx++;

  if(idx >= order.length){
    idx = 0;
  }

  CURRENT_SCHEDULE[row].days[day] =
    order[idx];

  renderScheduleTable();
}

function cellText(type){

  switch(type){

    case "request-off":
      return "D/O";

    case "admin-off":
      return "D/O";

    case "confirmed-off":
      return "D/O";

    case "annual":
      return "연차";

    default:
      return "";
  }
}

async function saveMonthlySchedule(){

  const month =
    document.getElementById("scheduleMonth").value;

  const schedules =
    CURRENT_SCHEDULE.map(s=>({
      name:s.name,
      days:s.days
    }));

  const result =
    await api({
      action:"saveMonthlySchedule",
      month,
      schedules
    });

  alert(result.message);
}

async function loadSavedSchedule(){

  const month =
    document.getElementById("scheduleMonth").value;

  const result =
    await api({
      action:"getMonthlySchedule",
      month
    });

  if(!result.schedules.length){
    alert("저장된 근무표가 없습니다.");
    return;
  }

  CURRENT_SCHEDULE =
    result.schedules.map(s=>({
      name:s.name,
      days:s.days
    }));

  renderScheduleTable();
}

async function viewEmployeeSchedule(){

  const month =
    document.getElementById("viewMonth").value;

  const name =
    document.getElementById("viewName").value;

  const result =
    await api({
      action:"getMonthlySchedule",
      month
    });

  const target =
    result.schedules.find(
      s=>s.name===name
    );

  const wrap =
    document.getElementById(
      "employeeScheduleResult"
    );

  if(!target){

    wrap.innerHTML =
      "근무표가 없습니다.";

    return;
  }

  let html =
    `<h3>${name}</h3>`;

  for(let d=1; d<=31; d++){

    const value =
      target.days[d];

    if(!value) continue;

    html += `
      ${d}일 :
      ${cellText(value) || "근무"}
      <br>
    `;
  }

  wrap.innerHTML = html;
}
async function updateOffStatus(name, month, offDays, status){

  const result = await api({
    action:"updateOffRequestStatus",
    name,
    month,
    offDays,
    status
  });

  if(result.success){
    alert(status + " 처리되었습니다.");
    await loadScheduleBase();
  }else{
    alert(result.message || "처리 중 오류가 발생했습니다.");
  }
}
function printSchedule(){

  renderPrintSchedule();

  document.body.classList.add("print-mode");

  setTimeout(() => {
    window.print();
    document.body.classList.remove("print-mode");
  }, 300);

}


function getPrevMonth(month){
  const [y,m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function getWeekday(yearMonth, day){
  const [y,m] = yearMonth.split("-").map(Number);
  return new Date(y, m - 1, day).getDay();
}

function daysInMonth(yearMonth){
  const [y,m] = yearMonth.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

async function copyPrevMonthWeekPattern(){

  const month = document.getElementById("scheduleMonth").value;

  if(!month){
    alert("기준월을 선택하세요.");
    return;
  }

  const prevMonth = getPrevMonth(month);

  const result = await api({
    action:"getMonthlySchedule",
    month:prevMonth
  });

  if(!result.success || !result.schedules || !result.schedules.length){
    alert("전월 저장 근무표가 없습니다.");
    return;
  }

  const currentLastDay = daysInMonth(month);
  const prevLastDay = daysInMonth(prevMonth);

  CURRENT_SCHEDULE = STAFF_LIST.map(staff => {
    const prev = result.schedules.find(s => s.name === staff.name);
    const days = {};

    if(prev && prev.days){
      for(let prevDay = 1; prevDay <= prevLastDay; prevDay++){
        const prevValue = prev.days[prevDay];

        if(!prevValue || prevValue === "work") continue;

        const prevWeekday = getWeekday(prevMonth, prevDay);

        for(let currentDay = 1; currentDay <= currentLastDay; currentDay++){
          if(getWeekday(month, currentDay) === prevWeekday){
            days[currentDay] = prevValue;
          }
        }
      }
    }

    return {
      name:staff.name,
      days
    };
  });

  await applyApprovedOffRequests(month);

  renderScheduleTable();

  alert(`${prevMonth} 요일패턴을 ${month} 근무표에 반영했습니다.`);
}

async function applyApprovedOffRequests(month){

  const requestResult = await api({
    action:"getOffRequests",
    month
  });

  const requests = requestResult.requests || [];

  requests.forEach(r => {
    if(r.status !== "승인") return;

    const target = CURRENT_SCHEDULE.find(s => s.name === r.name);
    if(!target) return;

    String(r.offDays)
      .split(",")
      .forEach(day => {
        if(day){
          target.days[Number(day)] = "request-off";
        }
      });
  });

  renderRequestSummary(requests);
}
function renderPrintSchedule(){

  const month = document.getElementById("scheduleMonth").value;
  const [year, mm] = month.split("-");

  let html = `
    <div class="print-header">
      <h1>한국의집 롯데월드몰점</h1>
      <h2>${year}년 ${Number(mm)}월 WORK SCHEDULE</h2>
    </div>
  `;

  html += createPrintTable(1,15);
  html += createPrintTable(16,31);

  html += `
    <div class="print-legend">
      <span><b class="legend-request"></b>요청</span>
      <span><b class="legend-admin"></b>관리</span>
      <span><b class="legend-confirmed"></b>승인</span>
      <span><b class="legend-annual"></b>연차</span>
      <span><b class="legend-saturday"></b>토요일</span>
      <span><b class="legend-sunday"></b>일요일</span>
    </div>
    <div class="print-note">
      ※ 근무 가능 인원: 휴무/관리/승인/연차가 아닌 직원 수
    </div>
  `;

  document.getElementById("printScheduleArea").innerHTML = html;
}

function createPrintTable(startDay,endDay){

    const month = document.getElementById("scheduleMonth").value;
    const [year, mm] = month.split("-");

    // 해당 월의 마지막 날짜 계산
    endDay = Math.min(endDay, new Date(year, mm, 0).getDate());

    const dayNames = ["일","월","화","수","목","금","토"];

  let html = `
  <table class="print-schedule-table">
    <thead>
      <tr>
        <th rowspan="2">직원명</th>
  `;

  for(let d=startDay; d<=endDay; d++){
    const week = getWeekday(month, d);
    const weekendClass = week === 0 ? "sunday" : week === 6 ? "saturday" : "";
    html += `<th class="${weekendClass}">${d}</th>`;
  }

  html += `
      </tr>
      <tr>
  `;

  for(let d=startDay; d<=endDay; d++){
    const week = getWeekday(month, d);
    const weekendClass = week === 0 ? "sunday" : week === 6 ? "saturday" : "";
    html += `<th class="${weekendClass}">${dayNames[week]}</th>`;
  }

  html += `
      </tr>
    </thead>
    <tbody>
  `;

  CURRENT_SCHEDULE.forEach(row=>{

    html += `<tr>`;
    html += `<td class="name">${row.name}</td>`;

    for(let d=startDay; d<=endDay; d++){

      const value = row.days?.[d] || "work";
      const week = getWeekday(month, d);
      const weekendClass = week === 0 ? "sunday" : week === 6 ? "saturday" : "";

      html += `
      <td class="schedule-cell ${value} ${weekendClass}">
        ${cellText(value)}
      </td>
      `;
    }

    html += `</tr>`;
  });

  html += `
    <tr class="available-row">
      <td class="name">근무 가능</td>
  `;

  for(let d=startDay; d<=endDay; d++){

    const availableCount = CURRENT_SCHEDULE.filter(row=>{
      const value = row.days?.[d] || "work";
      return value === "work";
    }).length;

    const week = getWeekday(month, d);
    const weekendClass = week === 0 ? "sunday" : week === 6 ? "saturday" : "";

    html += `<td class="${weekendClass}">${availableCount}</td>`;
  }

  html += `
    </tr>
  `;

  html += `
    </tbody>
  </table>
  `;

  return html;
}