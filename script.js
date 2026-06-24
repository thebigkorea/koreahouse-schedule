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

    wrap.innerHTML =
      "휴무 신청 내역이 없습니다.";

    return;
  }

  wrap.innerHTML =
    requests.map(r=>
      `• ${r.name} : ${r.offDays}`
    ).join("<br>");
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
      return "희망";

    case "admin-off":
      return "관리";

    case "confirmed-off":
      return "휴무";

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