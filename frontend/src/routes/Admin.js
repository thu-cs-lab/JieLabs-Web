import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { get } from '../util';

export default React.memo(() => {
  const [users, setUsers] = useState([]);
  const history = useHistory();
  const dispatch = useDispatch();

  const doRefresh = useCallback(async () => {
    let result = await get('/api/user/list?offset=0&limit=-1');
    setUsers(result.users);
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
  </main>;
});
