import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import Manager from '../components/Manager';


function mapStateToProps() {
  return {
  };
}

function mapDispatchToProps(dispatch: Dispatch) {
  return bindActionCreators(
    {
    },
    dispatch
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(Manager);
