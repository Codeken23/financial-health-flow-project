import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const sb=createClient('https://fgfaejqcrlqimlqgrieh.supabase.co','sb_publishable_guOcss5nubI6GLBiJhpnQQ_oyujNVhn');
const $=x=>document.getElementById(x),money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0),
iso=d=>{let x=new Date(d);return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10)},
add=(d,n)=>{let x=new Date(d);x.setDate(x.getDate()+n);return x},
fri=(d=new Date())=>{let x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()-5+7)%7));return x},
inR=(s,a,z)=>{let d=new Date(s+'T00:00:00');return d>=a&&d<=z},
monthKey=d=>d.slice(0,7),monthStart=m=>m+'-01',monthLabel=m=>new Date(m+'-01T00:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'});
const card=(l,v)=>'<div class="card"><span>'+l+'</span><strong>'+v+'</strong></div>';

let hh=null,inc=[],exp=[],bills=[],res=[],debts=[],sav=[],savtx=[],plans=[],planItems=[],tab='Dashboard',selectedPlanMonth=iso(new Date()).slice(0,7),savingsFlash='';
const tabs=['Dashboard','Income','Expenses','Bills','Savings','Monthly Game Plan','Monthly Health','Weekly History','Debts'];

$('signin').onclick=async()=>{let{error}=await sb.auth.signInWithPassword({email:$('email').value,password:$('password').value});$('msg').textContent=error?error.message:''};
$('signup').onclick=async()=>{let{error}=await sb.auth.signUp({email:$('email').value,password:$('password').value});$('msg').textContent=error?error.message:'Account created. Confirm email if requested.'};
$('signout').onclick=()=>sb.auth.signOut();

sb.auth.onAuthStateChange(async(_,s)=>{if(s){$('auth').classList.add('hidden');$('app').classList.remove('hidden');await boot(s.user)}else{$('app').classList.add('hidden');$('auth').classList.remove('hidden')}});
let{data:{session}}=await sb.auth.getSession();if(session){$('auth').classList.add('hidden');$('app').classList.remove('hidden');await boot(session.user)}

async function boot(u){
 let{data:h,error}=await sb.from('households').select('*').eq('owner_id',u.id).maybeSingle();if(error){showErr(error.message);return}
 if(!h){let r=await sb.from('households').insert({owner_id:u.id,name:'Household'}).select().single();h=r.data}
 hh=h;await load()
}
async function load(){
 let hid=hh.id,[a,b,c,d,e,f,g,h,i]=await Promise.all([
  sb.from('income').select('*').eq('household_id',hid).order('received_date',{ascending:false}),
  sb.from('expenses').select('*').eq('household_id',hid).order('paid_date',{ascending:false}),
  sb.from('bills').select('*').eq('household_id',hid).order('due_date'),
  sb.from('reserves').select('*').eq('household_id',hid),
  sb.from('debts').select('*').eq('household_id',hid),
  sb.from('savings_accounts').select('*').eq('household_id',hid).order('created_at'),
  sb.from('savings_transactions').select('*').eq('household_id',hid).order('transaction_date',{ascending:false}),
  sb.from('monthly_gameplans').select('*').eq('household_id',hid).order('plan_month'),
  sb.from('monthly_plan_items').select('*').eq('household_id',hid).order('due_date',{ascending:true})
 ]),err=a.error||b.error||c.error||d.error||e.error||f.error||g.error||h.error||i.error;
 if(err){showErr(err.message);return}
 inc=a.data||[];exp=b.data||[];bills=c.data||[];res=d.data||[];debts=e.data||[];sav=f.data||[];savtx=g.data||[];plans=h.data||[];planItems=i.data||[];
 nav();render()
}
function showErr(m){$('content').innerHTML='<div class="panel"><h2>Error</h2><p class="neg">'+m+'</p></div>'}
function nav(){$('nav').innerHTML=tabs.map(x=>'<button class="'+(x===tab?'active':'')+'" data-t="'+x+'">'+x+'</button>').join('');document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;nav();render()})}
function met(){
 let s=fri(),z=add(s,6),
 wi=inc.filter(x=>inR(x.received_date,s,z)),
 paidWeek=exp.filter(x=>(x.status||'Paid')==='Paid'&&inR(x.paid_date,s,z)),
 sp=wi.reduce((t,x)=>t+Number(x.amount)*(1-Number(x.tax_rate||0)),0),
 ex=paidWeek.reduce((t,x)=>t+Number(x.amount),0),
 actualCash=sp-ex,
 today=new Date();today.setHours(0,0,0,0);
 let next=add(fri(today),7),
 plannedExp=exp.filter(x=>(x.status||'Paid')!=='Paid').filter(x=>{let d=new Date(x.paid_date+'T00:00:00');return d>=today&&d<=next}),
 unpaidBills=bills.filter(x=>x.status!=='Paid'&&x.priority==='Critical').filter(x=>{let d=new Date(x.due_date+'T00:00:00');return d>=today&&d<=next}),
 commitments=plannedExp.map(x=>({kind:'Expense',name:x.description||x.category,amount:Number(x.amount),date:x.paid_date,status:x.status||'Planned'}));
 for(const b of unpaidBills){
   let bd=new Date(b.due_date+'T00:00:00'),ba=Number(b.amount);
   let duplicate=plannedExp.some(x=>{let xd=new Date(x.paid_date+'T00:00:00'),days=Math.abs((xd-bd)/86400000);return Math.abs(Number(x.amount)-ba)<0.01&&days<=3});
   if(!duplicate)commitments.push({kind:'Bill',name:b.name,amount:ba,date:b.due_date,status:b.status});
 }
 let committed=commitments.reduce((t,x)=>t+x.amount,0),livingReserve=348,
 projectedAfterCommitments=actualCash-committed,
 safeToSpend=Math.max(0,projectedAfterCommitments-livingReserve),
 rent=res.find(x=>String(x.name).toLowerCase().includes('rent')),
 sTotal=sav.reduce((t,x)=>t+Number(x.current_balance||0),0);
 return{s,z,sp,ex,actualCash,committed,commitments,livingReserve,projectedAfterCommitments,safeToSpend,rent:Number(rent?.current_amount||0),target:Number(rent?.target_amount||1850),rentId:rent?.id,sTotal}
}
function render(){
 try{
  let m=met(),c=$('content');
  if(tab==='Dashboard')c.innerHTML=dashboardView(m);
  if(tab==='Income')c.innerHTML=incomeView();
  if(tab==='Expenses')c.innerHTML=expenseView();
  if(tab==='Bills')c.innerHTML=billsView();
  if(tab==='Savings')c.innerHTML=savingsView();
  if(tab==='Monthly Game Plan')c.innerHTML=gameView();
  if(tab==='Monthly Health')c.innerHTML=monthView();
  if(tab==='Weekly History')c.innerHTML=weekView();
  if(tab==='Debts')c.innerHTML=debtView();
  wire()
 }catch(e){showErr(e.message||String(e))}
}
function dashboardView(m){
 return '<div class="hero">'+
 card('Actual Cash Remaining',money(m.actualCash))+
 card('Safe-to-Spend',money(m.safeToSpend))+
 '</div>'+
 '<div class="grid">'+
 card('Spendable Income This Pay Week',money(m.sp))+
 card('Actual Paid Expenses',money(m.ex))+
 card('Committed Before Next Paycheck',money(m.committed))+
 card('Projected After Commitments',money(m.projectedAfterCommitments))+
 card('Weekly Living Reserve',money(m.livingReserve))+
 card('Total Savings',money(m.sTotal))+
 card('Rent Reserve',money(m.rent))+
 card('Rent Gap',money(Math.max(0,m.target-m.rent)))+
 '</div>'+
 '<div class="panel"><h2>Committed Upcoming Bills</h2><p class="note">These are planned to leave your account before the next paycheck, but they are not counted in Actual Paid Expenses until you mark them Paid.</p>'+
 (m.commitments.length?'<table><thead><tr><th>Bill</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>'+m.commitments.map(x=>'<tr><td>'+x.name+'</td><td>'+money(x.amount)+'</td><td>'+x.due_date+'</td><td>'+x.status+'</td></tr>').join('')+'</tbody></table>':'<p class="note">No critical unpaid bills due before the next paycheck.</p>')+
 '</div>'+
 '<div class="panel"><h2>Quick Savings Update</h2><p class="note">Deposit into or withdraw from any savings account without leaving the dashboard.</p>'+
 '<div class="quickSave"><label>Account<select id="qSaveAcct"><option value="">Select savings account</option>'+sav.map(x=>'<option value="'+x.id+'">'+x.name+' — '+money(x.current_balance)+'</option>').join('')+'</select></label>'+
 '<label>Action<select id="qSaveType"><option>Deposit</option><option>Withdrawal</option></select></label>'+
 '<label>Amount<input id="qSaveAmt" type="number" step=".01" placeholder="$0.00"></label>'+
 '<label>Source / note<input id="qSaveNote" placeholder="Paycheck, transfer, emergency..."></label><button id="qSaveBtn">Update Savings</button></div></div>'
}
function incomeView(){return'<div class="panel"><h2>Income</h2><div class="form"><input id="idate" type="date" value="'+iso(new Date())+'"><select id="ip"><option>You</option><option>Spouse</option></select><select id="it"><option>Regular</option><option>Commission</option><option>Other</option></select><input id="ia" type="number" placeholder="Amount"><input id="itr" type="number" step=".01" value="0" placeholder="Tax rate"><button id="addi">Add Income</button></div></div><div class="panel"><h2>Income History</h2><table><thead><tr><th>Date</th><th>Person</th><th>Type</th><th>Gross</th><th>Spendable</th></tr></thead><tbody>'+inc.map(x=>'<tr><td>'+x.received_date+'</td><td>'+x.person+'</td><td>'+x.income_type+'</td><td>'+money(x.amount)+'</td><td>'+money(Number(x.amount)*(1-Number(x.tax_rate||0)))+'</td></tr>').join('')+'</tbody></table></div>'}
function expenseView(){return'<div class="panel"><h2 id="expenseFormTitle">Expenses</h2><p class="note" id="expenseEditNote">Add a new expense, or tap Edit below to load an existing expense here.</p><input id="editExpenseId" type="hidden" value=""><div class="form"><input id="edate" type="date" value="'+iso(new Date())+'"><input id="ec" value="Groceries"><input id="ed" placeholder="Description"><input id="ea" type="number" step=".01" placeholder="Amount"><select id="enw"><option>Need</option><option>Want</option><option>Neither</option></select><select id="estatus"><option>Paid</option><option>Pending</option><option>Planned</option></select><div class="actions"><button id="adde">Add Expense</button><button id="cancelExpenseEdit" class="secondary hidden" type="button">Cancel Edit</button></div></div></div><div class="panel"><h2>Expense History</h2><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Need/Want</th><th>Status</th><th>Source</th><th>Actions</th></tr></thead><tbody>'+exp.map(x=>'<tr><td>'+x.paid_date+'</td><td>'+x.category+'</td><td>'+(x.description||'')+'</td><td>'+money(x.amount)+'</td><td>'+x.need_want+'</td><td>'+(x.bill_id?'Bill':'Manual')+'</td><td><div class="actions"><button class="small editExpense" data-id="'+x.id+'">Edit</button><button class="small danger deleteExpense" data-id="'+x.id+'">Delete</button></div></td></tr>').join('')+'</tbody></table></div>'}
function billsView(){return'<div class="panel"><h2 id="billFormTitle">Add Bill</h2><p class="note" id="billEditNote">Add a new bill, or tap Edit below to load an existing bill here.</p><input id="editBillId" type="hidden" value=""><div class="form"><input id="bn" placeholder="Bill name"><input id="ba" type="number" step=".01" placeholder="Amount"><input id="bd" type="date" value="'+iso(new Date())+'"><select id="bp"><option>Critical</option><option>Reserve</option><option>Can Wait</option></select><input id="bnotes" placeholder="Notes"><div class="actions"><button id="addb">Add Bill</button><button id="cancelBillEdit" class="secondary hidden" type="button">Cancel Edit</button></div></div></div><div class="panel"><h2>Bills</h2><table><thead><tr><th>Bill</th><th>Amount</th><th>Due</th><th>Priority</th><th>Status</th><th>Paid Date</th><th></th></tr></thead><tbody>'+bills.map(x=>'<tr><td>'+x.name+'</td><td>'+money(x.amount)+'</td><td>'+x.due_date+'</td><td>'+x.priority+'</td><td><select class="billStatus" data-id="'+x.id+'"><option '+(x.status==='Unpaid'?'selected':'')+'>Unpaid</option><option '+(x.status==='Paid'?'selected':'')+'>Paid</option><option '+(x.status==='Hold'?'selected':'')+'>Hold</option></select></td><td>'+(x.paid_date||'—')+'</td><td><button class="small editBill" data-id="'+x.id+'">Edit</button></td></tr>').join('')+'</tbody></table></div>'}
function savingsView(){
 let total=sav.reduce((t,x)=>t+Number(x.current_balance||0),0),target=sav.reduce((t,x)=>t+Number(x.target_balance||0),0);
 return '<div class="grid">'+card('Total Savings',money(total))+card('Combined Targets',money(target))+card('Remaining to Targets',money(Math.max(0,target-total)))+'</div>'+
 '<div class="panel"><h2>Add Savings Account / Goal</h2><div class="form"><input id="sn" placeholder="Account or goal name"><select id="stype"><option>Savings</option><option>Emergency Fund</option><option>Vacation</option><option>Car Repair</option><option>Other</option></select><input id="sbal" type="number" step=".01" placeholder="Starting balance"><input id="starget" type="number" step=".01" placeholder="Target balance"><button id="adds">Add Savings Goal</button></div></div>'+
 '<div class="panel"><h2>Add / Reduce Savings</h2><div class="form"><select id="sa"><option value="">Select account</option>'+sav.map(x=>'<option value="'+x.id+'">'+x.name+' — '+money(x.current_balance)+'</option>').join('')+'</select><input id="sd" type="date" value="'+iso(new Date())+'"><select id="stx"><option>Deposit</option><option>Withdrawal</option></select><input id="samt" type="number" step=".01" placeholder="Amount"><input id="ssrc" placeholder="Source / note"><button id="addstx">Record</button></div></div>'+
 '<div class="panel"><h2>Savings Accounts</h2>'+sav.map(x=>{let pct=Number(x.target_balance)>0?Math.min(100,Number(x.current_balance)/Number(x.target_balance)*100):0;return'<div style="margin:16px 0"><strong>'+x.name+'</strong><p class="note">'+money(x.current_balance)+' of '+money(x.target_balance||0)+'</p><div class="progress"><i style="width:'+pct+'%"></i></div></div>'}).join('')+'</div>'+
 '<div class="panel"><h2>Savings History</h2><table><thead><tr><th>Date</th><th>Account</th><th>Type</th><th>Amount</th><th>Source</th></tr></thead><tbody>'+savtx.map(t=>{let a=sav.find(x=>x.id===t.savings_account_id);return'<tr><td>'+t.transaction_date+'</td><td>'+(a?.name||'')+'</td><td>'+t.transaction_type+'</td><td>'+money(t.amount)+'</td><td>'+(t.source||'')+'</td></tr>'}).join('')+'</tbody></table></div>'
}
function gameView(){
 const p=plans.find(x=>monthKey(x.plan_month)===selectedPlanMonth),items=p?planItems.filter(x=>x.gameplan_id===p.id):[],planned=items.reduce((t,x)=>t+Number(x.amount||0),0),
 expected=Number(p?.expected_income||0),save=Number(p?.savings_target||0),debt=Number(p?.debt_extra_target||0),projected=expected-planned-save-debt,
 ai=inc.filter(x=>x.received_date.startsWith(selectedPlanMonth)).reduce((t,x)=>t+Number(x.amount)*(1-Number(x.tax_rate||0)),0),
 ae=exp.filter(x=>x.paid_date.startsWith(selectedPlanMonth)).reduce((t,x)=>t+Number(x.amount),0),actual=ai-ae;
 return '<div class="panel"><h2>Monthly Game Plan</h2><div class="planbar"><label>Plan month<input id="planMonth" type="month" value="'+selectedPlanMonth+'"></label><button id="loadPlan" class="secondary">Open Month</button><button id="copyBills" class="secondary">Copy Bills Into This Month</button></div></div>'+
 '<div class="grid">'+card('Expected Income',money(expected))+card('Planned Obligations',money(planned))+card('Savings Target',money(save))+card('Extra Debt Target',money(debt))+card('Projected Cushion',money(projected))+card('Actual Income',money(ai))+card('Actual Expenses',money(ae))+card('Actual Cash Flow',money(actual))+'</div>'+
 '<div class="panel"><h2>'+monthLabel(selectedPlanMonth)+' Strategy</h2><div class="form"><input id="gpIncome" type="number" value="'+expected+'" placeholder="Expected income"><input id="gpSavings" type="number" value="'+save+'" placeholder="Savings target"><input id="gpDebt" type="number" value="'+debt+'" placeholder="Extra debt target"><textarea id="gpNotes" class="wide" placeholder="Strategy notes">'+(p?.strategy_notes||'')+'</textarea><button id="savePlan">Save Monthly Strategy</button></div></div>'+
 '<div class="panel"><h2>Add Planned Item</h2><div class="form"><select id="piType"><option>Bill</option><option>Living</option><option>Reserve</option><option>Debt</option><option>Other</option></select><input id="piName" placeholder="Item name"><input id="piAmount" type="number" placeholder="Amount"><input id="piDue" type="date" value="'+selectedPlanMonth+'-01"><select id="piPriority"><option>Critical</option><option>Reserve</option><option>Can Wait</option></select><input id="piNotes" placeholder="Notes"><button id="addPlanItem">Add to Game Plan</button></div></div>'+
 '<div class="panel"><h2>Planned Spending & Priorities</h2><table><thead><tr><th>Type</th><th>Item</th><th>Amount</th><th>Due</th><th>Priority</th><th>Status</th><th>Notes</th><th></th></tr></thead><tbody>'+items.map(x=>'<tr><td>'+x.item_type+'</td><td>'+x.name+'</td><td>'+money(x.amount)+'</td><td>'+(x.due_date||'—')+'</td><td>'+x.priority+'</td><td><select class="piStatus" data-id="'+x.id+'"><option '+(x.status==='Planned'?'selected':'')+'>Planned</option><option '+(x.status==='Funded'?'selected':'')+'>Funded</option><option '+(x.status==='Paid'?'selected':'')+'>Paid</option><option '+(x.status==='Skipped'?'selected':'')+'>Skipped</option></select></td><td>'+(x.notes||'')+'</td><td><button class="small danger delPlanItem" data-id="'+x.id+'">Delete</button></td></tr>').join('')+'</tbody></table></div>'
}
function monthView(){let keys=[...new Set([...inc.map(x=>x.received_date.slice(0,7)),...exp.map(x=>x.paid_date.slice(0,7)),...savtx.map(x=>x.transaction_date.slice(0,7))])].sort().reverse();return'<div class="panel"><h2>Monthly Health</h2><table><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Savings Deposits</th><th>Savings Withdrawals</th><th>Cash Flow</th></tr></thead><tbody>'+keys.map(k=>{let i=inc.filter(x=>x.received_date.startsWith(k)).reduce((t,x)=>t+Number(x.amount)*(1-Number(x.tax_rate||0)),0),e=exp.filter(x=>(x.status||'Paid')==='Paid'&&x.paid_date.startsWith(k)).reduce((t,x)=>t+Number(x.amount),0),d=savtx.filter(x=>x.transaction_date.startsWith(k)&&x.transaction_type==='Deposit').reduce((t,x)=>t+Number(x.amount),0),w=savtx.filter(x=>x.transaction_date.startsWith(k)&&x.transaction_type==='Withdrawal').reduce((t,x)=>t+Number(x.amount),0);return'<tr><td>'+k+'</td><td>'+money(i)+'</td><td>'+money(e)+'</td><td>'+money(d)+'</td><td>'+money(w)+'</td><td class="'+(i-e>=0?'pos':'neg')+'">'+money(i-e)+'</td></tr>'}).join('')+'</tbody></table></div>'}
function weekView(){
 let keys=[...new Set([
  ...inc.map(x=>iso(fri(new Date(x.received_date+'T00:00:00')))),
  ...exp.filter(x=>(x.status||'Paid')==='Paid').map(x=>iso(fri(new Date(x.paid_date+'T00:00:00'))))
 ])].sort().reverse();
 return '<div class="panel"><h2>Weekly History</h2><p class="note">Each pay week stands alone. Income shows only money received during that Friday–Thursday period. Paid Expenses shows only expenses actually paid during that same period. Money left from a prior week is not counted as new income.</p><table><thead><tr><th>Pay Week</th><th>Income Made</th><th>Paid Expenses</th><th>Weekly Net</th></tr></thead><tbody>'+
 keys.map(s=>{
   let a=new Date(s+'T00:00:00'),z=add(a,6);
   let i=inc.filter(x=>inR(x.received_date,a,z)).reduce((t,x)=>t+Number(x.amount)*(1-Number(x.tax_rate||0)),0);
   let e=exp.filter(x=>(x.status||'Paid')==='Paid'&&inR(x.paid_date,a,z)).reduce((t,x)=>t+Number(x.amount),0);
   let net=i-e;
   return '<tr><td>'+s+' → '+iso(z)+'</td><td>'+money(i)+'</td><td>'+money(e)+'</td><td class="'+(net>=0?'pos':'neg')+'">'+money(net)+'</td></tr>'
 }).join('')+
 '</tbody></table></div>'
}
function debtView(){return'<div class="grid">'+debts.map(x=>card(x.name+' Principal',money(x.current_principal))+card('APR',Number(x.apr||0).toFixed(2)+'%')+card('Minimum Payment',money(x.minimum_payment))+card('Total Paid',money(x.total_paid))).join('')+'</div>'}

async function savingsTxn(id,type,amt,date,source){
 const status=$('qSaveStatus'),btn=$('qSaveBtn')||$('addstx');
 const feedback=(message,isError=false)=>{savingsFlash=message;if(status){status.textContent=message;status.className='saveStatus '+(isError?'neg':'pos')}else if(isError)alert(message)};
 if(!id){feedback('Select a savings account first.',true);return}
 if(!Number.isFinite(amt)||amt<=0){feedback('Enter an amount greater than zero.',true);return}
 if(btn){btn.disabled=true;btn.textContent='Saving…'}
 savingsFlash='';
 const{data,error}=await sb.rpc('apply_savings_transaction',{p_account_id:id,p_transaction_type:type,p_amount:amt,p_transaction_date:date,p_source:source||''});
 if(error){feedback(error.message||'Savings could not be updated.',true);if(btn){btn.disabled=false;btn.textContent=btn.id==='qSaveBtn'?'Update Savings':'Record'}return}
 savingsFlash=(type==='Deposit'?'Deposit':'Withdrawal')+' saved. New balance: '+money(data);
 await load()
}
async function ensurePlan(){
 let p=plans.find(x=>monthKey(x.plan_month)===selectedPlanMonth);if(p)return p;
 let{data,error}=await sb.from('monthly_gameplans').insert({household_id:hh.id,plan_month:monthStart(selectedPlanMonth),expected_income:0,savings_target:0,debt_extra_target:0,strategy_notes:''}).select().single();
 if(error){alert(error.message);return null}return data
}
function wire(){
 if($('addi'))$('addi').onclick=async()=>{if(!$('ia').value)return;let{error}=await sb.from('income').insert({household_id:hh.id,person:$('ip').value,income_type:$('it').value,amount:Number($('ia').value),tax_rate:Number($('itr').value||0),received_date:$('idate').value});if(error)alert(error.message);else await load()};
 if($('adde'))$('adde').onclick=async()=>{if(!$('ea').value)return;let id=$('editExpenseId').value;let row={household_id:hh.id,category:$('ec').value||'Other',description:$('ed').value,amount:Number($('ea').value),need_want:$('enw').value,paid_date:$('edate').value,status:$('estatus').value};let q;if(id){q=await sb.from('expenses').update(row).eq('id',id);let x=exp.find(e=>e.id===id);if(!q.error&&x?.bill_id){if($('estatus').value==='Paid'){await sb.from('bills').update({amount:Number($('ea').value),paid_date:$('edate').value,status:'Paid'}).eq('id',x.bill_id)}else{await sb.from('bills').update({amount:Number($('ea').value),paid_date:null,status:'Unpaid'}).eq('id',x.bill_id)}}}else{q=await sb.from('expenses').insert(row)}if(q.error)alert(q.error.message);else await load()};
 document.querySelectorAll('.editExpense').forEach(btn=>btn.onclick=()=>{let x=exp.find(e=>e.id===btn.dataset.id);if(!x)return;$('editExpenseId').value=x.id;$('edate').value=x.paid_date;$('ec').value=x.category||'Other';$('ed').value=x.description||'';$('ea').value=Number(x.amount);$('enw').value=x.need_want||'Need';$('estatus').value=x.status||'Paid';$('expenseFormTitle').textContent='Edit Expense';$('expenseEditNote').textContent='Update the amount, date, category, description, Need/Want classification, or payment status, then tap Save Changes.';$('adde').textContent='Save Changes';$('cancelExpenseEdit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})});
 document.querySelectorAll('.deleteExpense').forEach(btn=>btn.onclick=async()=>{let x=exp.find(e=>e.id===btn.dataset.id);if(!x)return;let extra=x.bill_id?' This expense is linked to a paid bill; deleting it will also mark that bill Unpaid so the dashboard stays consistent.':'';if(!confirm('Delete this expense?'+extra))return;let{error}=await sb.from('expenses').delete().eq('id',x.id);if(error){alert(error.message);return}if(x.bill_id){let u=await sb.from('bills').update({status:'Unpaid',paid_date:null}).eq('id',x.bill_id);if(u.error){alert('Expense was deleted, but the linked bill could not be reset: '+u.error.message)}}await load()});
 if($('cancelExpenseEdit'))$('cancelExpenseEdit').onclick=()=>{render()};
 if($('addb'))$('addb').onclick=async()=>{if(!$('bn').value||!$('ba').value)return;let id=$('editBillId').value;let row={household_id:hh.id,name:$('bn').value,amount:Number($('ba').value),due_date:$('bd').value,priority:$('bp').value,notes:$('bnotes').value||null};let q;if(id){q=await sb.from('bills').update(row).eq('id',id);let linked=exp.find(e=>e.bill_id===id);if(!q.error&&linked){await sb.from('expenses').update({amount:Number($('ba').value),paid_date:$('bd').value,description:'Bill payment: '+$('bn').value}).eq('id',linked.id)}}else{q=await sb.from('bills').insert({...row,status:'Unpaid'})}if(q.error)alert(q.error.message);else await load()};
 document.querySelectorAll('.billStatus').forEach(s=>s.onchange=async()=>{let b=bills.find(x=>x.id===s.dataset.id),st=s.value;if(st==='Paid'){let pd=prompt('Actual paid date (YYYY-MM-DD)',b.paid_date||iso(new Date()));if(!pd){s.value=b.status;return}let u=await sb.from('bills').update({status:'Paid',paid_date:pd}).eq('id',b.id);if(u.error){alert(u.error.message);return}let{data:existing}=await sb.from('expenses').select('id').eq('bill_id',b.id).maybeSingle(),row={household_id:hh.id,bill_id:b.id,category:'Bill Payment',description:b.name,amount:Number(b.amount),need_want:'Need',paid_date:pd,status:'Paid'};let q=existing?await sb.from('expenses').update(row).eq('id',existing.id):await sb.from('expenses').insert(row);if(q.error)alert(q.error.message)}else{await sb.from('bills').update({status:st,paid_date:null}).eq('id',b.id);await sb.from('expenses').delete().eq('bill_id',b.id)}await load()});
 document.querySelectorAll('.editBill').forEach(btn=>btn.onclick=()=>{let b=bills.find(x=>x.id===btn.dataset.id);if(!b)return;$('editBillId').value=b.id;$('bn').value=b.name||'';$('ba').value=Number(b.amount);$('bd').value=b.due_date||iso(new Date());$('bp').value=b.priority||'Critical';$('bnotes').value=b.notes||'';$('billFormTitle').textContent='Edit Bill';$('billEditNote').textContent='Change the amount, due date, name, priority, or notes, then tap Save Changes.';$('addb').textContent='Save Changes';$('cancelBillEdit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})});
 if($('cancelBillEdit'))$('cancelBillEdit').onclick=()=>{render()};
 if($('adds'))$('adds').onclick=async()=>{if(!$('sn').value)return;let{error}=await sb.from('savings_accounts').insert({household_id:hh.id,name:$('sn').value,account_type:$('stype').value,current_balance:Number($('sbal').value||0),target_balance:Number($('starget').value||0)});if(error)alert(error.message);else await load()};
 if($('addstx'))$('addstx').onclick=()=>savingsTxn($('sa').value,$('stx').value,Number($('samt').value||0),$('sd').value,$('ssrc').value);
 if($('qSaveBtn'))$('qSaveBtn').onclick=()=>savingsTxn($('qSaveAcct').value,$('qSaveType').value,Number($('qSaveAmt').value||0),iso(new Date()),$('qSaveNote').value);
 if($('loadPlan'))$('loadPlan').onclick=()=>{selectedPlanMonth=$('planMonth').value||selectedPlanMonth;render()};
 if($('savePlan'))$('savePlan').onclick=async()=>{let p=await ensurePlan();if(!p)return;let{error}=await sb.from('monthly_gameplans').update({expected_income:Number($('gpIncome').value||0),savings_target:Number($('gpSavings').value||0),debt_extra_target:Number($('gpDebt').value||0),strategy_notes:$('gpNotes').value,updated_at:new Date().toISOString()}).eq('id',p.id);if(error)alert(error.message);else await load()};
 if($('addPlanItem'))$('addPlanItem').onclick=async()=>{if(!$('piName').value||!$('piAmount').value)return;let p=await ensurePlan();if(!p)return;let{error}=await sb.from('monthly_plan_items').insert({household_id:hh.id,gameplan_id:p.id,item_type:$('piType').value,name:$('piName').value,amount:Number($('piAmount').value),due_date:$('piDue').value||null,priority:$('piPriority').value,status:'Planned',notes:$('piNotes').value});if(error)alert(error.message);else await load()};
 if($('copyBills'))$('copyBills').onclick=async()=>{let p=await ensurePlan();if(!p)return;let exNames=new Set(planItems.filter(x=>x.gameplan_id===p.id).map(x=>x.name.toLowerCase())),rows=bills.filter(b=>!exNames.has(b.name.toLowerCase())).map(b=>{let day=Math.min(28,Number(String(b.due_date).slice(-2))||1);return{household_id:hh.id,gameplan_id:p.id,item_type:'Bill',name:b.name,amount:Number(b.amount),due_date:selectedPlanMonth+'-'+String(day).padStart(2,'0'),priority:b.priority||'Critical',status:'Planned',notes:'Copied from Bills'}});if(!rows.length){alert('No new bills to copy.');return}let{error}=await sb.from('monthly_plan_items').insert(rows);if(error)alert(error.message);else await load()};
 document.querySelectorAll('.piStatus').forEach(s=>s.onchange=async()=>{let{error}=await sb.from('monthly_plan_items').update({status:s.value}).eq('id',s.dataset.id);if(error)alert(error.message);else await load()});
 document.querySelectorAll('.delPlanItem').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this planned item?'))return;let{error}=await sb.from('monthly_plan_items').delete().eq('id',b.dataset.id);if(error)alert(error.message);else await load()})
}

