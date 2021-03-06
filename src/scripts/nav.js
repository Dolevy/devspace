import React from 'react';

import request from 'superagent';
import Throttle from 'superagent-throttle';
import parseLinkHeader from 'parse-link-header';

import Icon from './icon';

class Nav extends React.Component {
	constructor() {
		super();

		this.state = {
			prCounter: undefined,
			issueCounter: undefined,
			notificationCounter: undefined
		};
	}

	/* ======================================================================
	   Lifecycle
	   ====================================================================== */

	shouldComponentUpdate(nextProps, nextState) {
		return nextProps.isOnline !== this.props.isOnline ||
			nextProps.isVisible !== this.props.isVisible ||
			nextState.prCounter !== this.state.prCounter ||
			nextState.issueCounter !== this.state.issueCounter ||
			nextState.notificationCounter !== this.state.notificationCounter;
	}

	componentDidMount() {
		this.throttle = new Throttle({
			rate: 15,
			concurrent: 15
		});

		this.initCounters();
		this.initNotification();
	}

	componentWillUpdate(nextProps) {
		if (nextProps.isOnline === true) {
			this.initCounters();
			this.initNotification();
		}
		else if (nextProps.isOnline === false) {
			this.clearCounters();
			this.clearNotification();
		}

		if (nextProps.isVisible === true) {
			this.initCounters();
			this.initNotification();
		}
		else if (nextProps.isVisible === false) {
			this.clearCounters();
			this.clearNotification();
		}
	}

	componentWillUnmount() {
		this.clearCounters();
		this.clearNotification();
	}

	/* ======================================================================
	   Counters
	   ====================================================================== */

	initCounters() {
		this.fetchCounter('pr');
		this.fetchCounter('issue');

		this.prInterval = window.setInterval(() => {
			this.fetchCounter('pr');
		}, 60 * 1000);

		this.issueInterval = window.setInterval(() => {
			this.fetchCounter('issue');
		}, 60 * 1000);
	}

	fetchCounter(type) {
		request
			.get(`https://api.github.com/search/issues?q=state:open+is:${type}+user:${this.props.github.username}`)
			.use(this.throttle.plugin)
			.set('Authorization', 'token ' + this.props.github.accessToken)
			.end(this.handleCounterResponse.bind(this, type));
	}

	handleCounterResponse(type, error, response) {
		if (response && response.status === 200) {
			if (response.body.total_count > 99) {
				if (type === 'pr') {
					this.setState({
						prCounter: '99+'
					});
				} else if (type === 'issue') {
					this.setState({
						issueCounter: '99+'
					});
				}
			} else if (response.body.total_count !== 0) {
				if (type === 'pr') {
					this.setState({
						prCounter: response.body.total_count
					});
				} else if (type === 'issue') {
					this.setState({
						issueCounter: response.body.total_count
					});
				}
			}
		}
	}

	clearCounters() {
		window.clearInterval(this.prInterval);
		window.clearInterval(this.issueInterval);
	}

	/* ======================================================================
	   Notifications
	   ====================================================================== */

	initNotification() {
		this.fetchNotification();

		this.notificationInterval = window.setInterval(() => {
			this.fetchNotification();
		}, 60 * 1000);
	}

	fetchNotification() {
		request
			.get('https://api.github.com/notifications')
			.query({ per_page: 1 })
			.query({ preventCache: new Date().getTime() })
			.use(this.throttle.plugin)
			.set('Authorization', 'token ' + this.props.github.accessToken)
			.end(this.handleNotificationResponse.bind(this));
	}

	handleNotificationResponse(error, response) {
		if (response && response.status === 200) {
			if (response.headers.link) {
				let total = parseLinkHeader(response.headers.link).last.page;

				if (parseInt(total, 10) > 99) {
					total = '+99';
				}

				this.setState({
					notificationCounter: total
				});
			} else if (Object.keys(response.body).length === 1) {
				this.setState({
					notificationCounter: 1
				});
			} else {
				this.setState({
					notificationCounter: undefined
				});
			}
		}
	}

	clearNotification() {
		window.clearInterval(this.notificationInterval);
	}

	/* ======================================================================
	   Trackers
	   ====================================================================== */

	trackLink(event) {
		mixpanel.track('Clicked Sidebar', {
			title: event.currentTarget.getAttribute('aria-label')
		});
	}

	handleSettingsLink(event) {
		this.trackLink(event);
		this.props.toggleSettingsModal();
	}

	handleLogoutLink(event) {
		this.trackLink(event);
		this.props.logout();
	}

	/* ======================================================================
	   Render
	   ====================================================================== */

	renderCounter(type) {
		if (type === 'pr') {
			if (this.state.prCounter) {
				return (
					<div className="nav-counter">
						<div>{this.state.prCounter}</div>
					</div>
				)
			}
		} else if (type === 'issue') {
			if (this.state.issueCounter) {
				return (
					<div className="nav-counter">
						<div>{this.state.issueCounter}</div>
					</div>
				)
			}
		}

		return;
	}

	renderNotification() {
		if (this.state.notificationCounter) {
			return (
				<div className="nav-counter">
					<div>{this.state.notificationCounter}</div>
				</div>
			)
		}

		return;
	}

	render() {
		return (
			<div className="nav-container">
				<nav className="nav">
					<header className="nav-top">
						<ul className="nav-list">
							<li className="nav-item">
								<a className="nav-link tooltipped tooltipped-e" onClick={this.trackLink.bind(this)} href={"https://github.com/notifications"} target="_blank" aria-label="Notifications">
									<Icon name="bell" className="nav-icon" />
									{this.renderNotification()}
								</a>
							</li>
							<li className="nav-item">
								<a className="nav-link tooltipped tooltipped-e" onClick={this.trackLink.bind(this)} href={"https://github.com/pulls?q=is:open+type:pr+user:%22" + this.props.github.username + "%22"} target="_blank" aria-label="Pull Requests">
									<Icon name="git-pull-request" className="nav-icon" />
									{this.renderCounter('pr')}
								</a>
							</li>
							<li className="nav-item">
								<a className="nav-link tooltipped tooltipped-e" onClick={this.trackLink.bind(this)} href={"https://github.com/issues?q=is:open+type:issue+user:%22" + this.props.github.username + "%22"} target="_blank" aria-label="Issues">
									<Icon name="issue-opened" className="nav-icon" />
									{this.renderCounter('issue')}
								</a>
							</li>
						</ul>
					</header>
					<footer className="nav-footer">
						<ul className="nav-list">
							<li className="nav-item">
								<a className="nav-link tooltipped tooltipped-e" onClick={this.trackLink.bind(this)} href="https://github.com/devspace/devspace/issues/new" target="_blank" aria-label="Report a bug">
									<Icon name="bug" className="nav-icon" />
								</a>
							</li>
							<li className="nav-item">
								<a className="nav-link tooltipped tooltipped-e" onClick={this.handleSettingsLink.bind(this)} aria-label="Settings">
									<Icon name="gear" className="nav-icon" />
								</a>
							</li>
							<li className="nav-item">
								<a className="nav-link tooltipped tooltipped-e" onClick={this.handleLogoutLink.bind(this)} aria-label="Logout">
									<Icon name="sign-out" className="nav-icon" />
								</a>
							</li>
						</ul>
					</footer>
				</nav>
			</div>
		)
	}
}

export default Nav;