import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { get } from '../util';

export default React.memo(() => {
  const [users, setUsers] = useState([]);
  const [boards, setBoards] = useState([]);
  const [jobs, setJobs] = useState([]);
  const history = useHistory();
  const dispatch = useDispatch();

  const doRefresh = useCallback(async () => {
    let result = await get('/api/user/list?offset=0&limit=-1');
    setUsers(result.users);
    result = await get('/api/board/list');
    setBoards(result);
    result = await get('/api/task/list?offset=0&limit=-1');
    setJobs(result.jobs);
  }, []);

  return <main className="centering">
    <button onClick={doRefresh}>
      Refresh
    </button>
    {users.map(user => 
      <div>
        <p>{`Name: ${user.user_name}`}</p>
        <p>{`Real Name: ${user.real_name}`}</p>
        <p>{`Student Id: ${user.student_id}`}</p>
        <p>{`Class: ${user.class}`}</p>
      </div>
    )}
    {boards.map(board => 
      <div>
        <p>{`Remove: ${board.remote}`}</p>
        <p>{`Software Version: ${board.software_version}`}</p>
        <p>{`Hardware Version: ${board.hardware_version}`}</p>
      </div>
    )}
    {jobs.map(job => 
      <div>
        <p>{`Submitter: ${job.submitter}`}</p>
        <p>{`Src: ${job.src_url}`}</p>
        <p>{`Dst: ${job.dst_url}`}</p>
      </div>
    )}
  </main>;
});
