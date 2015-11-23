import React from 'react';
import Rebase from 're-base';

import Scrollbar from 'perfect-scrollbar';
import { Spinner } from 'elemental/lib/Elemental';

import Event from './event';

var base = Rebase.createClass('https://devspace-io.firebaseio.com/');

class Column extends React.Component {
	constructor() {
		super();

		this.state = {
			events: undefined,
			error: undefined
		};
	}

	componentDidMount() {
		Scrollbar.initialize(this.refs.content, {
			suppressScrollX: true
		});

		this.fetchEvents();
	fetchEvents() {
		fetch(`https://api.github.com/${this.props.details.request.prefix}/${this.props.details.request.payload}/${this.props.details.request.suffix}`, {
			headers: {
				'Authorization': 'token ' + this.props.accessToken,
				'User-Agent': 'DevSpace'
			}
		})
		.then((response) => {
			if (response.status >= 200 && response.status < 300) {
				return response.json();
			} else {
				throw new Error(response.statusText);
			}
		})
		.then((response) => {
			if (response.length > 0) {
				this.setState({
					events: response
				});
			}
			else {
				this.setState({
					error: 'No public results'
				});
			}
		})
		.catch((error) => {
			this.setState({
				error: error.message
			});
		});
	}

	componentDidUpdate() {
		Scrollbar.update(this.refs.content);
	}

	renderEvent(event, key) {
		return <Event key={key} details={this.state.events[key]} />;
	}

	renderEventLoading() {
		return <div className="centered"><Spinner size="md" /></div>;
	}

	renderError() {
		return <div className="column-placeholder centered">{this.state.error}</div>;
	}

	renderContent() {
		if (this.state.events) {
			return this.state.events.map(this.renderEvent.bind(this));
		}
		else if (this.state.error) {
			return this.renderError();
		}
		else {
			return this.renderEventLoading();
		}
	}

	render() {
		return (
			<section className="column">
				<div className="column-container">
					<header className="column-header">
						<h1 className="column-header-title">
							<span className={"octicon octicon-" + this.props.details.icon}></span>
							{this.props.details.request.payload}
							<span className="octicon octicon-x" onClick={this.props.removeColumn.bind()}></span>
						</h1>
					</header>
					<div ref="content" className="column-content">
						{this.renderContent()}
					</div>
				</div>
			</section>
		)
	}
}

export default Column;