(function define_horde_Engine () {

/**
 * Creates a new Engine object
 * @constructor
 */
horde.Engine = function horde_Engine () {
	this.lastUpdate = 0;
	this.canvases = {};
	
	this.objects = {};
	this.objectIdSeed = 0;
	this.activeObjectId = null;
	
	this.keyboard = new horde.Keyboard();
	
	this.view = new horde.Size(640, 480);
	
	this.images = null;

};

var proto = horde.Engine.prototype;

/**
 * Adds an object to the engine's collection
 * @param {horde.Object} Object to add
 * @return {number} ID of the newly added object
 */ 
proto.addObject = function horde_Engine_proto_addObject (object) {
	this.objectIdSeed++;
	var id = "o" + this.objectIdSeed;
	object.id = id;
	this.objects[id] = object;
	return id;
};

proto.makeObject = function horde_Engine_proto_makeObject (type, supressInit) {
	var obj = new horde.Object();
	for (var x in horde.objectTypes[type]) {
		obj[x] = horde.objectTypes[type][x];
	}
	if (supressInit !== true) {
		obj.init();
	}
	return obj;
};

proto.spawnObject = function horde_Engine_proto_spawnObject (parent, type) {
	var o = this.makeObject(type, true);
	o.ownerId = parent.id;
	o.team = parent.team;
	o.centerOn(parent.boundingBox().center());
	o.setDirection(parent.facing);
	o.init();
	this.addObject(o);
};

/**
 * Initializes the engine
 * @return {void}
 */
proto.init = function horde_Engine_proto_init () {
	
	this.map = [
		[0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0],
		[0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0],
		[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
		[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
		[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
		[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	];
	
	this.tileSize = new horde.Size(32, 32);
	
	var hero = this.makeObject("hero");
	hero.centerOn(horde.Vector2.fromSize(this.view).scale(0.5));
	this.activeObjectId = this.addObject(hero);
	
	var numEnemies = horde.randomRange(50, 100);
	for (var x = 0; x < numEnemies; x++) {
		var e = this.makeObject("bat");
		e.position.x = (9 * this.tileSize.width) + horde.randomRange(0, 32);
		e.position.y = -2 * this.tileSize.height;
		e.setDirection(new horde.Vector2(0, 1));
		this.addObject(e);
	}
	
	this.canvases["display"] = horde.makeCanvas("display", this.view.width, this.view.height);
	
	this.images = new horde.ImageLoader();
	this.images.load({
		"background": "img/arena.png",
		"shadow": "img/arena_shadow.png",
		"characters": "img/sheet_characters.png",
		"objects": "img/sheet_objects.png"
	}, this.handleImagesLoaded, this);
	
};

horde.Engine.prototype.handleImagesLoaded = function horde_Engine_proto_handleImagesLoaded () {
	this.imagesLoaded = true;
};

horde.Engine.prototype.update = function horde_Engine_proto_update () {

	var now = horde.now();
	var elapsed = now - this.lastUpdate;
	this.lastUpdate = now;

	if (this.imagesLoaded !== true) {
		return;
	}
	
	this.handleInput();
	this.updateObjects(elapsed);
	this.render();
};

horde.Engine.prototype.updateObjects = function (elapsed) {
	
	for (var id in this.objects) {

		var o = this.objects[id];
		
		if (o.state === "dead") {
			delete(this.objects[o.id]);
			continue;
		}
		
		o.update(elapsed);

		var px = ((o.speed / 1000) * elapsed);
		
		var axis = [];
		
		if (o.direction.x !== 0) {
			// the object is moving along the "x" axis
			o.position.x += (o.direction.x * px);
			var b = o.boundingBox();
			var size = new horde.Vector2(b.width, b.height);
			var b = o.position.clone().scale(1 / this.tileSize.width).floor();
			var e = o.position.clone().add(size).scale(1 / this.tileSize.width).floor();
			check_x:
			for (var y = b.y; y <= e.y; y++) {
				for (var x = b.x; x <= e.x; x++) {
					if (this.map[y] && this.map[y][x] === 0) {
						if (o.direction.x > 0) {
							// moving right
							o.position.x = x * this.tileSize.width - o.size.width;
						} else {
							// moving left
							o.position.x = x * this.tileSize.width + this.tileSize.width;
						}
						axis.push("x");
						break check_x;
					}
				}
			}
		}
		
		if (o.direction.y !== 0) {
			// the object is moving along the "y" axis
			o.position.y += (o.direction.y * px);
			var b = o.boundingBox();
			var size = new horde.Vector2(b.width, b.height);
			var b = o.position.clone().scale(1 / this.tileSize.width).floor();
			var e = o.position.clone().add(size).scale(1 / this.tileSize.width).floor();
			check_y:
			for (var y = b.y; y <= e.y; y++) {
				for (var x = b.x; x <= e.x; x++) {
					if (this.map[y] && this.map[y][x] === 0) {
						if (o.direction.y > 0) {
							// moving down
							o.position.y = y * this.tileSize.height - o.size.height;
						} else {
							// moving up
							o.position.y = y * this.tileSize.height + this.tileSize.height;
						}
						axis.push("y");
						break check_y;
					}
				}
			}
		}
		
		if (o.direction.y < 0 && o.position.y < 0) {
			o.position.y = 0;
			axis.push("y");
		}
		
		if (axis.length > 0) {
			o.wallCollide(axis);
		}
	
		for (var x in this.objects) {
			var o2 = this.objects[x];
			if (o2.state !== "alive" || o2.team === o.team) {
				continue;
			}
			if (o.boundingBox().intersects(o2.boundingBox())) {
				this.dealDamage(o2, o);
				this.dealDamage(o, o2);
			}
		}
		
	}
	
};

// Deals damage from object "attacker" to "defender"
horde.Engine.prototype.dealDamage = function (attacker, defender) {
	if (defender.wound(attacker.damage)) {
		// defender has died; assign gold
		if (attacker.ownerId === null) {
			attacker.gold += defender.worth;
		} else {
			var owner = this.objects[attacker.ownerId];
			if (owner) {
				owner.gold += defender.worth;
			}
		}
	}
};

horde.Engine.prototype.handleInput = function () {
	
	var move = new horde.Vector2();
	
	if (this.keyboard.isKeyDown(37)) {
		move.x = -1;
	}
	
	if (this.keyboard.isKeyDown(38)) {
		move.y = -1;
	}
	
	if (this.keyboard.isKeyDown(39)) {
		move.x = 1;
	}
	
	if (this.keyboard.isKeyDown(40)) {
		move.y = 1;
	}
	
	var o = this.objects["o1"];
	
	o.stopMoving();
	
	if (move.x !== 0 || move.y !== 0) {
		o.setDirection(move);
	}
	
	if (this.keyboard.isKeyPressed(32)) {
		this.spawnObject(o, "h_rock");
	}
	
	this.keyboard.storeKeyStates();
	
};

horde.Engine.prototype.render = function () {
	
	var ctx = this.canvases["display"].getContext("2d");

	// Draw background
	ctx.drawImage(this.images.getImage("background"), 
		0, 0, 640, 480, 
		0, 0, this.view.width, this.view.height
	);
	
	// Draw objects
	this.drawObjects(ctx);
	
	// Draw shadow layer
	ctx.drawImage(this.images.getImage("shadow"),
		0, 0, 576, 386, 
		32, 0, 576, 386
	);
	
	// Draw UI1
	this.drawUI(ctx);

};

horde.Engine.prototype.drawObjects = function (ctx) {
	for (var id in this.objects) {
		var o = this.objects[id];
		var s = o.getSpriteXY();
		
		ctx.save();
		
		ctx.translate(
			o.position.x + o.size.width / 2, 
			o.position.y + o.size.height / 2
		);
		
		if (o.angle !== 0) {
			ctx.rotate(o.angle * Math.PI / 180);
		}
		
		ctx.drawImage(this.images.getImage(o.spriteSheet),
			s.x, s.y, o.size.width, o.size.height,
			-(o.size.width / 2), -(o.size.height / 2), o.size.width, o.size.height
		);
		ctx.restore();
	}
};

horde.Engine.prototype.drawUI = function (ctx) {
	
	var bar = {
		width : 320,
		height : 48,
		x : 34,
		y : 420
	};
	var o = this.objects["o1"];
	
	ctx.save();
	ctx.fillRect(bar.x, bar.y, bar.width, bar.height);
	ctx.fillStyle = "rgb(190, 22, 29)";
	ctx.fillRect(bar.x, bar.y, (bar.width - Math.round((bar.width * o.wounds) / o.hitPoints)), bar.height);
	ctx.fillStyle = "rgb(238, 28, 36)";
	ctx.fillRect(bar.x, bar.y + 10, (bar.width - Math.round((bar.width * o.wounds) / o.hitPoints)), bar.height - 20);
	ctx.fillStyle = "rgb(243, 97, 102)";
	ctx.fillRect(bar.x, bar.y + 20, (bar.width - Math.round((bar.width * o.wounds) / o.hitPoints)), bar.height - 40);
	ctx.restore();
	
};

horde.Engine.prototype.run = function () {
	this.init();
	this.lastUpdate = horde.now();
	this.interval = horde.setInterval(0, this.update, this);
};

horde.Engine.prototype.stop = function () {
	window.clearInterval(this.interval);
};

}());
